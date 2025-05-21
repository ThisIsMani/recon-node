// src/server/core/recon-engine/engine.js
const prisma = require('../../../services/prisma');
const { EntryStatus, EntryType, StagingEntryStatus, TransactionStatus } = require('@prisma/client');
const transactionCore = require('../transaction');
const { BalanceError } = require('../transaction'); // Assuming BalanceError is exported from transaction/index.js
const logger = require('../../../services/logger');

/**
 * Custom error for when no reconciliation rule is found.
 */
class NoReconRuleFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NoReconRuleFoundError';
  }
}

/**
 * Generates actual and expected entry data from a staging entry based on recon rules.
 * @param {object} stagingEntry - The staging entry object.
 * @param {string} merchantId - The ID of the merchant.
 * @returns {Promise<Array<object>>} A promise that resolves to an array containing two objects: [actualEntryData, expectedEntryData].
 * @throws {NoReconRuleFoundError} If no matching ReconRule is found.
 */
async function generateTransactionEntriesFromStaging(stagingEntry, merchantId) {
  const order_id = stagingEntry.metadata?.order_id;

  const actualEntryData = {
    account_id: stagingEntry.account_id,
    entry_type: stagingEntry.entry_type,
    amount: stagingEntry.amount,
    currency: stagingEntry.currency,
    status: EntryStatus.POSTED,
    effective_date: stagingEntry.effective_date,
    metadata: {
      ...(stagingEntry.metadata || {}),
      order_id: order_id,
      source_staging_entry_id: stagingEntry.staging_entry_id,
    },
  };

  const reconRule = await prisma.reconRule.findFirst({
    where: {
      merchant_id: merchantId,
      OR: [
        { account_one_id: stagingEntry.account_id },
        { account_two_id: stagingEntry.account_id },
      ],
    },
  });

  if (!reconRule) {
    throw new NoReconRuleFoundError(
      `No reconciliation rule found for merchant ${merchantId} and account ${stagingEntry.account_id}`
    );
  }

  let contra_account_id;
  if (reconRule.account_one_id === stagingEntry.account_id) {
    contra_account_id = reconRule.account_two_id;
  } else {
    contra_account_id = reconRule.account_one_id;
  }

  const expectedEntryType = stagingEntry.entry_type === EntryType.DEBIT ? EntryType.CREDIT : EntryType.DEBIT;

  const expectedEntryData = {
    account_id: contra_account_id,
    entry_type: expectedEntryType,
    amount: stagingEntry.amount,
    currency: stagingEntry.currency,
    status: EntryStatus.EXPECTED,
    effective_date: stagingEntry.effective_date,
    metadata: {
      order_id: order_id,
      source_staging_entry_id: stagingEntry.staging_entry_id,
      recon_rule_id: reconRule.id,
    },
  };

  return [actualEntryData, expectedEntryData];
}

/**
 * Processes a staging entry. It first tries to match the staging entry with an existing 'EXPECTED' entry.
 * If a match is found and validated, it logs success (Phase 1).
 * If a mismatch occurs, it updates statuses accordingly.
 * If no match is found, it proceeds to generate a new transaction with a new expectation.
 * @param {object} stagingEntry - The staging entry object from Prisma.
 * @param {string} merchantId - The ID of the merchant.
 * @returns {Promise<object>} The result of the processing, which could be the original transaction if matched (Phase 1),
 *                            or a new transaction if generated.
 * @throws {Error} If validation fails, an ambiguous match occurs, or other processing errors.
 */
async function processStagingEntryWithRecon(stagingEntry, merchantId) {
  if (!stagingEntry || !stagingEntry.staging_entry_id) {
    throw new Error('Invalid stagingEntry object provided to processStagingEntryWithRecon.');
  }
  if (!merchantId) {
    throw new Error('Invalid merchantId provided to processStagingEntryWithRecon.');
  }

  try {
    // Phase 1: Attempt to Match and Fulfill Existing Expectation
    const orderId = stagingEntry.metadata?.order_id;
    let matchedExpectedEntry = null;
    let originalTransaction = null;

    if (orderId) {
      logger.info(`[ReconEngine] Attempting to match StagingEntry ID: ${stagingEntry.staging_entry_id} with Order ID: ${orderId} for Account ID: ${stagingEntry.account_id}`);
      const potentialMatches = await prisma.entry.findMany({
        where: {
          account_id: stagingEntry.account_id,
          status: EntryStatus.EXPECTED,
          transaction: {
            merchant_id: merchantId,
            status: { 
              notIn: [TransactionStatus.ARCHIVED, TransactionStatus.MISMATCH], // Don't match with already archived or mismatched transactions
            },
          },
          // Assuming order_id is stored in metadata like: { "order_id": "someValue" }
          // Adjust the path if it's nested differently.
          metadata: {
            path: ['order_id'],
            equals: orderId,
          },
        },
        include: {
          transaction: {
            include: {
              entries: true, // To get the other leg for validation
            },
          },
        },
        orderBy: {
          created_at: 'desc', // Get the latest one if multiple (though ideally order_id + account_id for EXPECTED should be unique).
        },
      });

      if (potentialMatches.length === 1) {
        matchedExpectedEntry = potentialMatches[0];
        originalTransaction = matchedExpectedEntry.transaction;
        logger.info(`[ReconEngine] Found potential expected entry ${matchedExpectedEntry.entry_id} (Transaction ID: ${originalTransaction.transaction_id}) for staging_entry_id ${stagingEntry.staging_entry_id}`);
      } else if (potentialMatches.length > 1) {
        logger.warn(`[ReconEngine] Ambiguous match: Multiple expected entries found for order_id ${orderId} and account_id ${stagingEntry.account_id}. Staging entry ${stagingEntry.staging_entry_id} will be marked for manual review.`);
        await prisma.stagingEntry.update({
          where: { staging_entry_id: stagingEntry.staging_entry_id },
          data: {
            status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,
            // discarded_at: new Date(), // Removed for NEEDS_MANUAL_REVIEW
            metadata: { ...stagingEntry.metadata, error: 'Ambiguous match: Multiple expected entries found.', error_type: 'AmbiguousMatchError' }
          },
        });
        throw new Error(`Ambiguous match for staging_entry_id ${stagingEntry.staging_entry_id}: Multiple expected entries found.`);
      } else {
        logger.info(`[ReconEngine] No potential expected entry found for order_id ${orderId} and account_id ${stagingEntry.account_id}.`);
      }
    }

    if (matchedExpectedEntry && originalTransaction) {
      // Validation Phase
      let isValidMatch = true;
      let mismatchReason = "";

      // Validate amount
      if (stagingEntry.amount.comparedTo(matchedExpectedEntry.amount) !== 0) {
        isValidMatch = false;
        mismatchReason = `Amount mismatch: staging ${stagingEntry.amount.toFixed(2)}, expected ${matchedExpectedEntry.amount.toFixed(2)}`;
      }
      // Validate currency
      if (stagingEntry.currency !== matchedExpectedEntry.currency) {
        isValidMatch = false;
        mismatchReason = mismatchReason ? `${mismatchReason}; Currency mismatch: staging ${stagingEntry.currency}, expected ${matchedExpectedEntry.currency}` : `Currency mismatch: staging ${stagingEntry.currency}, expected ${matchedExpectedEntry.currency}`;
      }
      
      // Validate entry type: The incoming staging entry's type should match the expected entry's type.
      // This is because the expected entry already represents the "other side" of the original transaction.
      if (stagingEntry.entry_type !== matchedExpectedEntry.entry_type) {
         isValidMatch = false;
         mismatchReason = mismatchReason ? `${mismatchReason}; Entry type mismatch: staging ${stagingEntry.entry_type}, expected ${matchedExpectedEntry.entry_type}` : `Entry type mismatch: staging ${stagingEntry.entry_type}, expected ${matchedExpectedEntry.entry_type}`;
      }

      if (isValidMatch) {
        // Phase 2: Fulfill the match by archiving the old transaction and creating a new one.
        logger.info(`[ReconEngine] StagingEntry ${stagingEntry.staging_entry_id} successfully matched with ExpectedEntry ${matchedExpectedEntry.entry_id} from Transaction ${originalTransaction.transaction_id}. Proceeding with fulfillment.`);

        return await prisma.$transaction(async (tx) => {
          // a. Archive Original Transaction
          await tx.transaction.update({
            where: { transaction_id: originalTransaction.transaction_id },
            data: {
              status: TransactionStatus.ARCHIVED,
              discarded_at: new Date(),
            },
          });
          logger.info(`[ReconEngine] Archived original transaction ${originalTransaction.transaction_id}`);

          // Update discarded_at and status for all entries of the original transaction
          await tx.entry.updateMany({
            where: { transaction_id: originalTransaction.transaction_id },
            data: {
              discarded_at: new Date(),
              status: EntryStatus.ARCHIVED, // Set status to ARCHIVED
            },
          });
          logger.info(`[ReconEngine] Marked all entries as ARCHIVED and discarded for original transaction ${originalTransaction.transaction_id}`);

          // b. Prepare Data for the New Evolved Transaction
          const newTransactionShellData = {
            logical_transaction_id: originalTransaction.logical_transaction_id,
            version: originalTransaction.version + 1,
            merchant_id: originalTransaction.merchant_id,
            status: TransactionStatus.POSTED,
            metadata: {
              ...(stagingEntry.metadata || {}), // Keep staging entry metadata
              source_staging_entry_id: stagingEntry.staging_entry_id,
              evolved_from_transaction_id: originalTransaction.transaction_id,
              fulfilled_expected_entry_id: matchedExpectedEntry.entry_id,
            },
          };

          // c. Prepare Data for the Two New POSTED Entries
          // New Entry 1 (from the current stagingEntry - this is the actual fulfillment)
          const fulfillingEntryData = {
            account_id: stagingEntry.account_id, // This is the account of the matchedExpectedEntry
            entry_type: stagingEntry.entry_type, // This should match matchedExpectedEntry.entry_type
            amount: stagingEntry.amount,
            currency: stagingEntry.currency,
            status: EntryStatus.POSTED,
            effective_date: stagingEntry.effective_date,
            metadata: {
              ...(stagingEntry.metadata || {}), // Keep staging entry metadata
              source_staging_entry_id: stagingEntry.staging_entry_id,
              fulfilled_expected_entry_id: matchedExpectedEntry.entry_id,
            },
          };

          // New Entry 2 (from the other leg of originalTransaction)
          const originalPostedEntry = originalTransaction.entries.find(
            (e) => e.entry_id !== matchedExpectedEntry.entry_id && e.status === EntryStatus.POSTED
          );

          if (!originalPostedEntry) {
            // This should ideally not happen if the original transaction was well-formed
            logger.error(`[ReconEngine] Critical error: Could not find the original posted entry in transaction ${originalTransaction.transaction_id} to create the evolved transaction.`);
            throw new Error(`Critical error: Original posted entry not found for transaction ${originalTransaction.transaction_id}.`);
          }

          const carriedOverEntryData = {
            account_id: originalPostedEntry.account_id,
            entry_type: originalPostedEntry.entry_type,
            amount: originalPostedEntry.amount,
            currency: originalPostedEntry.currency,
            status: EntryStatus.POSTED,
            effective_date: stagingEntry.effective_date, // Use fulfilling entry's date for consistency
            metadata: {
              ...(originalPostedEntry.metadata || {}),
              derived_from_entry_id: originalPostedEntry.entry_id,
            },
          };
          
          // d. Create New Evolved Transaction
          // Ensure the order of entries for createTransactionInternal is (actual, expected) or (debit, credit)
          // For a fully POSTED transaction, the distinction is less about actual/expected and more about ensuring balance.
          // The createTransactionInternal function expects two entries and will validate their balance.
          const newEvolvedTransaction = await transactionCore.createTransactionInternal(
            newTransactionShellData,
            fulfillingEntryData, // This is one leg
            carriedOverEntryData, // This is the other leg
            tx // Pass the transaction client
          );
          logger.info(`[ReconEngine] Created new evolved transaction ${newEvolvedTransaction.transaction_id} version ${newTransactionShellData.version}`);

          // e. Update Staging Entry
          await tx.stagingEntry.update({
            where: { staging_entry_id: stagingEntry.staging_entry_id },
            data: {
              status: StagingEntryStatus.PROCESSED,
              discarded_at: new Date(),
              metadata: {
                ...stagingEntry.metadata, // Keep original staging metadata
                matched_transaction_id: originalTransaction.transaction_id, // Record the transaction it matched
                matched_entry_id: matchedExpectedEntry.entry_id, // Record the entry it matched
                evolved_transaction_id: newEvolvedTransaction.transaction_id, // Record the new transaction created
                match_type: 'Phase2_Fulfilled',
              },
            },
          });
          logger.info(`[ReconEngine] Updated staging entry ${stagingEntry.staging_entry_id} to PROCESSED with evolution details.`);

          return newEvolvedTransaction;
        });

      } else {
        // Match Found but Invalid (Mismatch)
        logger.warn(`[ReconEngine] Mismatch for StagingEntry ${stagingEntry.staging_entry_id} with ExpectedEntry ${matchedExpectedEntry.entry_id}: ${mismatchReason}`);
        await prisma.$transaction(async (tx) => {
          await tx.transaction.update({
            where: { transaction_id: originalTransaction.transaction_id },
            data: { status: TransactionStatus.MISMATCH },
          });
          await tx.stagingEntry.update({
            where: { staging_entry_id: stagingEntry.staging_entry_id },
            data: { 
              status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,
              // discarded_at: new Date(), // Removed for NEEDS_MANUAL_REVIEW
              metadata: { ...stagingEntry.metadata, error: mismatchReason, error_type: 'MismatchError', matched_transaction_id: originalTransaction.transaction_id }
            },
          });
        });
        throw new Error(`Mismatch detected for staging_entry_id ${stagingEntry.staging_entry_id}: ${mismatchReason}`);
      }
    } else { // This is the "NO match found" path - Mark for manual review and throw error
      const noMatchReason = `No matching expected entry found for staging_entry_id ${stagingEntry.staging_entry_id}. Staging entry requires manual review.`;
      logger.warn(`[ReconEngine] ${noMatchReason}`);
      
      await prisma.stagingEntry.update({
        where: { staging_entry_id: stagingEntry.staging_entry_id },
        data: {
          status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,
          // discarded_at is NOT set here
          metadata: { ...(stagingEntry.metadata || {}), error: noMatchReason, error_type: 'NoMatchFoundError' }
        },
      });
      const noMatchError = new Error(noMatchReason);
      noMatchError.name = 'NoMatchFoundError'; 
      throw noMatchError;
    }

  } catch (error) {
    logger.error(`Error in processStagingEntryWithRecon for staging_entry_id ${stagingEntry.staging_entry_id}: ${error.message}`, error);

    // Ensure stagingEntry.metadata is not null before spreading
    const currentMetadata = stagingEntry.metadata || {};

    // Check if status was already updated by a more specific handler
    // This check might be overly cautious if all specific handlers re-throw.
    // The primary goal is to ensure NEEDS_MANUAL_REVIEW is set without discarded_at for errors.
    if (error.name === 'NoMatchFoundError' || error.message.startsWith('Ambiguous match') || error.message.startsWith('Mismatch detected')) {
      // Status already set appropriately by the specific handlers, and discarded_at was intentionally not set.
      // No further stagingEntry update needed here for these specific errors.
    } else if (error instanceof NoReconRuleFoundError || error instanceof BalanceError) {
      try {
        await prisma.stagingEntry.update({
          where: { staging_entry_id: stagingEntry.staging_entry_id },
          data: { status: StagingEntryStatus.NEEDS_MANUAL_REVIEW, /* discarded_at not set */ metadata: { ...currentMetadata, error: error.message, error_type: error.name } },
        });
        logger.log(`StagingEntry ${stagingEntry.staging_entry_id} marked as NEEDS_MANUAL_REVIEW due to ${error.name}.`);
      } catch (updateError) {
        logger.error(`Failed to update StagingEntry ${stagingEntry.staging_entry_id} status after ${error.name}: ${updateError.message}`, updateError);
      }
    } else {
      // For other unexpected errors, also mark as needs manual review without discarding
      try {
        await prisma.stagingEntry.update({
          where: { staging_entry_id: stagingEntry.staging_entry_id },
          data: { status: StagingEntryStatus.NEEDS_MANUAL_REVIEW, /* discarded_at not set */ metadata: { ...currentMetadata, error: error.message, error_type: error.name || 'GenericError' } },
        });
        logger.log(`StagingEntry ${stagingEntry.staging_entry_id} marked as NEEDS_MANUAL_REVIEW due to a generic error.`);
      } catch (updateError) {
        logger.error(`Failed to update StagingEntry ${stagingEntry.staging_entry_id} status after generic error: ${updateError.message}`, updateError);
      }
    }
    throw error; // Re-throw the original error to be caught by the consumer
  }
}

module.exports = {
  generateTransactionEntriesFromStaging,
  NoReconRuleFoundError,
  processStagingEntryWithRecon,
};
