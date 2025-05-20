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

module.exports = {
  generateTransactionEntriesFromStaging,
  NoReconRuleFoundError,
  processStagingEntryWithRecon, // Add new function to exports
};

/**
 * Processes a staging entry by generating transaction entries and creating the transaction.
 * Handles specific errors by updating the staging entry status and re-throwing the error.
 * @param {object} stagingEntry - The staging entry object from Prisma, including `staging_entry_id` and `metadata`.
 * @param {string} merchantId - The ID of the merchant.
 * @returns {Promise<object>} The newly created transaction object with its entries.
 * @throws {NoReconRuleFoundError} If no matching ReconRule is found.
 * @throws {BalanceError} If entries do not balance during transaction creation.
 * @throws {Error} For other processing errors.
 */
async function processStagingEntryWithRecon(stagingEntry, merchantId) {
  if (!stagingEntry || !stagingEntry.staging_entry_id) {
    throw new Error('Invalid stagingEntry object provided to processStagingEntryWithRecon.');
  }
  if (!merchantId) {
    throw new Error('Invalid merchantId provided to processStagingEntryWithRecon.');
  }

  try {
    const [actualEntryData, expectedEntryData] = await generateTransactionEntriesFromStaging(stagingEntry, merchantId);

    const transactionShellData = {
      merchant_id: merchantId,
      status: TransactionStatus.POSTED,
      metadata: { 
        ...(stagingEntry.metadata || {}), 
        source_staging_entry_id: stagingEntry.staging_entry_id 
      },
      // logical_transaction_id and version will use Prisma defaults
    };

    const newTransaction = await transactionCore.createTransactionInternal(
      transactionShellData,
      actualEntryData,
      expectedEntryData
    );

    // If successful, update StagingEntry status to PROCESSED
    await prisma.stagingEntry.update({
      where: { staging_entry_id: stagingEntry.staging_entry_id },
      data: { status: StagingEntryStatus.PROCESSED },
    });

    logger.log(`Successfully processed staging_entry_id: ${stagingEntry.staging_entry_id}. Transaction created: ${newTransaction.transaction_id}`);
    return newTransaction;

  } catch (error) {
    logger.error(`Error in processStagingEntryWithRecon for staging_entry_id ${stagingEntry.staging_entry_id}: ${error.message}`, error);

    if (error instanceof NoReconRuleFoundError || error instanceof BalanceError) {
      try {
        await prisma.stagingEntry.update({
          where: { staging_entry_id: stagingEntry.staging_entry_id },
          data: { status: StagingEntryStatus.NEEDS_MANUAL_REVIEW, metadata: { ...stagingEntry.metadata, error: error.message, error_type: error.name } },
        });
        logger.log(`StagingEntry ${stagingEntry.staging_entry_id} marked as NEEDS_MANUAL_REVIEW due to ${error.name}.`);
      } catch (updateError) {
        logger.error(`Failed to update StagingEntry ${stagingEntry.staging_entry_id} status after ${error.name}: ${updateError.message}`, updateError);
        // If updating the staging entry fails, we should still re-throw the original error.
      }
    } else {
      // For other unexpected errors, also mark as needs manual review
      try {
        await prisma.stagingEntry.update({
          where: { staging_entry_id: stagingEntry.staging_entry_id },
          data: { status: StagingEntryStatus.NEEDS_MANUAL_REVIEW, metadata: { ...stagingEntry.metadata, error: error.message, error_type: error.name || 'GenericError' } },
        });
        logger.log(`StagingEntry ${stagingEntry.staging_entry_id} marked as NEEDS_MANUAL_REVIEW due to a generic error.`);
      } catch (updateError) {
        logger.error(`Failed to update StagingEntry ${stagingEntry.staging_entry_id} status after generic error: ${updateError.message}`, updateError);
      }
    }
    throw error; // Re-throw the original error to be caught by the consumer
  }
}
