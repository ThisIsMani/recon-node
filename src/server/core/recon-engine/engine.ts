import prisma from '../../../services/prisma';
import { 
    EntryStatus, 
    EntryType, 
    StagingEntryStatus, 
    TransactionStatus, 
    StagingEntryProcessingMode,
    StagingEntry,
    Entry as PrismaEntry,
    Transaction as PrismaTransaction,
    ReconRule,
    Prisma
} from '@prisma/client';
import * as transactionCore from '../transaction'; // Now TS
import { BalanceError } from '../transaction'; // Now TS
import logger from '../../../services/logger';
import type { CreateEntryInternalData } from '../entry'; // For typing

export class NoReconRuleFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoReconRuleFoundError';
  }
}

// Type for the data structure returned by generateTransactionEntriesFromStaging
type GeneratedEntryPair = [CreateEntryInternalData, CreateEntryInternalData];

async function generateTransactionEntriesFromStaging(stagingEntry: StagingEntry, merchantId: string): Promise<GeneratedEntryPair> {
  const order_id = (stagingEntry.metadata as Prisma.JsonObject)?.order_id as string | undefined;

  const actualEntryData: CreateEntryInternalData = {
    account_id: stagingEntry.account_id,
    entry_type: stagingEntry.entry_type as EntryType, // Cast if StagingEntry.entry_type is string
    amount: stagingEntry.amount,
    currency: stagingEntry.currency,
    status: EntryStatus.POSTED,
    effective_date: stagingEntry.effective_date,
    transaction_id: '', // Placeholder, will be set by createTransactionInternal if not part of this data
    metadata: {
      ...(stagingEntry.metadata as Prisma.JsonObject || {}),
      order_id: order_id,
      source_staging_entry_id: stagingEntry.staging_entry_id,
    },
  };

  const reconRule = await prisma.reconRule.findFirst({
    where: {
      merchant_id: merchantId,
      account_one_id: stagingEntry.account_id,
    },
  });

  if (!reconRule) {
    throw new NoReconRuleFoundError(
      `No reconciliation rule found for merchant ${merchantId} where account ${stagingEntry.account_id} is account_one_id (for generating transaction entries)`
    );
  }

  const contra_account_id = reconRule.account_two_id;
  const expectedEntryType = stagingEntry.entry_type === EntryType.DEBIT ? EntryType.CREDIT : EntryType.DEBIT;

  const expectedEntryData: CreateEntryInternalData = {
    account_id: contra_account_id,
    entry_type: expectedEntryType,
    amount: stagingEntry.amount,
    currency: stagingEntry.currency,
    status: EntryStatus.EXPECTED,
    effective_date: stagingEntry.effective_date,
    transaction_id: '', // Placeholder
    metadata: {
      ...(stagingEntry.metadata as Prisma.JsonObject || {}),
      order_id: order_id,
      source_staging_entry_id: stagingEntry.staging_entry_id,
      recon_rule_id: reconRule.id,
    },
  };

  return [actualEntryData, expectedEntryData];
}

type StagingEntryWithIncludes = StagingEntry & {
    transaction?: (PrismaTransaction & { entries: PrismaEntry[] }) | null;
    account?: { merchant_id: string } | null; 
};


async function processStagingEntryWithRecon(stagingEntryFull: StagingEntryWithIncludes, merchantId: string): Promise<PrismaTransaction | null> {
  const stagingEntry = stagingEntryFull; // Use the more complete type

  if (!stagingEntry || !stagingEntry.staging_entry_id) {
    throw new Error('Invalid stagingEntry object provided to processStagingEntryWithRecon.');
  }
  if (!merchantId) {
    throw new Error('Invalid merchantId provided to processStagingEntryWithRecon.');
  }
  if (!stagingEntry.processing_mode || !Object.values(StagingEntryProcessingMode).includes(stagingEntry.processing_mode as StagingEntryProcessingMode)) {
    logger.error(`[ReconEngine] Invalid or missing processing_mode: ${stagingEntry.processing_mode} for staging_entry_id ${stagingEntry.staging_entry_id}`);
    await prisma.stagingEntry.update({
        where: { staging_entry_id: stagingEntry.staging_entry_id },
        data: { status: StagingEntryStatus.NEEDS_MANUAL_REVIEW, metadata: { ...(stagingEntry.metadata as Prisma.JsonObject || {}), error: `Invalid or missing processing_mode: ${stagingEntry.processing_mode}`, error_type: 'InvalidProcessingModeError' }},
    });
    throw new Error(`Invalid or missing processing_mode for staging_entry_id ${stagingEntry.staging_entry_id}.`);
  }

  try {
    const processingMode = stagingEntry.processing_mode as StagingEntryProcessingMode;

    if (processingMode === StagingEntryProcessingMode.CONFIRMATION) {
      logger.info(`[ReconEngine] Processing StagingEntry ${stagingEntry.staging_entry_id} in CONFIRMATION mode.`);
      const orderId = (stagingEntry.metadata as Prisma.JsonObject)?.order_id as string | undefined;
      let attemptMatchLogic = false;

      const reconRule = await prisma.reconRule.findFirst({
        where: {
          merchant_id: merchantId,
          account_two_id: stagingEntry.account_id,
        },
      });

      if (reconRule && orderId) {
        attemptMatchLogic = true;
        logger.info(`[ReconEngine] CONFIRMATION mode: ReconRule found (ID: ${reconRule.id}). StagingEntry account ${stagingEntry.account_id} is account_two_id. Attempting match for order_id: ${orderId}.`);
      } else {
        logger.info(`[ReconEngine] CONFIRMATION mode: Conditions for match attempt not met (Rule: ${reconRule ? reconRule.id : 'none'}, Staging Acc: ${stagingEntry.account_id}, Order ID: ${orderId}). Skipping direct match attempt.`);
      }
      
      let matchedExpectedEntry: (PrismaEntry & { transaction: (PrismaTransaction & { entries: PrismaEntry[] }) | null }) | null = null;
      let originalTransaction: (PrismaTransaction & { entries: PrismaEntry[] }) | null = null;

      if (attemptMatchLogic) {
        const potentialMatches = await prisma.entry.findMany({
          where: {
            account_id: stagingEntry.account_id,
            status: EntryStatus.EXPECTED,
            transaction: {
              merchant_id: merchantId,
              status: { notIn: [TransactionStatus.ARCHIVED, TransactionStatus.MISMATCH] },
            },
            metadata: { path: ['order_id'], equals: orderId },
          },
          include: { transaction: { include: { entries: true } } },
          orderBy: { created_at: 'desc' },
        });

        if (potentialMatches.length === 1) {
          matchedExpectedEntry = potentialMatches[0] as (PrismaEntry & { transaction: (PrismaTransaction & { entries: PrismaEntry[] }) | null });
          originalTransaction = matchedExpectedEntry.transaction;
          logger.info(`[ReconEngine] CONFIRMATION mode: Found potential expected entry ${matchedExpectedEntry.entry_id} (Transaction ID: ${originalTransaction?.transaction_id}) for staging_entry_id ${stagingEntry.staging_entry_id}`);
        } else if (potentialMatches.length > 1) {
          logger.warn(`[ReconEngine] CONFIRMATION mode: Ambiguous match for StagingEntry ${stagingEntry.staging_entry_id}.`);
          await prisma.stagingEntry.update({
            where: { staging_entry_id: stagingEntry.staging_entry_id },
            data: { status: StagingEntryStatus.NEEDS_MANUAL_REVIEW, metadata: { ...(stagingEntry.metadata as Prisma.JsonObject || {}), error: 'Ambiguous match: Multiple expected entries found.', error_type: 'AmbiguousMatchError' }},
          });
          throw new Error(`Ambiguous match for staging_entry_id ${stagingEntry.staging_entry_id}: Multiple expected entries found.`);
        } else {
          logger.info(`[ReconEngine] CONFIRMATION mode: No potential expected entry found for order_id ${orderId} (match was attempted).`);
        }
      }

      if (matchedExpectedEntry && originalTransaction) {
        let isValidMatch = true;
        let mismatchReason = "";
        if (stagingEntry.amount.comparedTo(matchedExpectedEntry.amount) !== 0) {
          isValidMatch = false;
          mismatchReason = `Amount mismatch: staging ${stagingEntry.amount.toFixed(2)}, expected ${matchedExpectedEntry.amount.toFixed(2)}`;
        }
        if (stagingEntry.currency !== matchedExpectedEntry.currency) {
          isValidMatch = false;
          mismatchReason = mismatchReason ? `${mismatchReason}; Currency mismatch: staging ${stagingEntry.currency}, expected ${matchedExpectedEntry.currency}` : `Currency mismatch: staging ${stagingEntry.currency}, expected ${matchedExpectedEntry.currency}`;
        }
        if (stagingEntry.entry_type !== matchedExpectedEntry.entry_type) {
           isValidMatch = false;
           mismatchReason = mismatchReason ? `${mismatchReason}; Entry type mismatch: staging ${stagingEntry.entry_type}, expected ${matchedExpectedEntry.entry_type}` : `Entry type mismatch: staging ${stagingEntry.entry_type}, expected ${matchedExpectedEntry.entry_type}`;
        }

        if (isValidMatch) {
          logger.info(`[ReconEngine] StagingEntry ${stagingEntry.staging_entry_id} successfully matched with ExpectedEntry ${matchedExpectedEntry.entry_id}. Proceeding with fulfillment.`);
          return await prisma.$transaction(async (tx) => {
            await tx.transaction.update({
              where: { transaction_id: originalTransaction!.transaction_id },
              data: { status: TransactionStatus.ARCHIVED, discarded_at: new Date() },
            });
            logger.info(`[ReconEngine] Archived original transaction ${originalTransaction!.transaction_id}`);
            await tx.entry.updateMany({
              where: { transaction_id: originalTransaction!.transaction_id },
              data: { discarded_at: new Date(), status: EntryStatus.ARCHIVED },
            });
            logger.info(`[ReconEngine] Marked all entries as ARCHIVED and discarded for original transaction ${originalTransaction!.transaction_id}`);
            
            const newTransactionShellData = {
              logical_transaction_id: originalTransaction!.logical_transaction_id,
              version: originalTransaction!.version + 1,
              merchant_id: originalTransaction!.merchant_id,
              status: TransactionStatus.POSTED,
              metadata: { ...(stagingEntry.metadata as Prisma.JsonObject || {}), source_staging_entry_id: stagingEntry.staging_entry_id, evolved_from_transaction_id: originalTransaction!.transaction_id, fulfilled_expected_entry_id: matchedExpectedEntry.entry_id },
            };
            const fulfillingEntryData: CreateEntryInternalData = {
              account_id: stagingEntry.account_id, entry_type: stagingEntry.entry_type as EntryType, amount: stagingEntry.amount, currency: stagingEntry.currency, status: EntryStatus.POSTED, effective_date: stagingEntry.effective_date,
              transaction_id: '', // Placeholder
              metadata: { ...(stagingEntry.metadata as Prisma.JsonObject || {}), source_staging_entry_id: stagingEntry.staging_entry_id, fulfilled_expected_entry_id: matchedExpectedEntry.entry_id },
            };
            const originalPostedEntry = originalTransaction!.entries.find(e => e.entry_id !== matchedExpectedEntry.entry_id && e.status === EntryStatus.POSTED);
            if (!originalPostedEntry) {
              logger.error(`[ReconEngine] Critical error: Could not find original posted entry in transaction ${originalTransaction!.transaction_id}.`);
              throw new Error(`Critical error: Original posted entry not found for transaction ${originalTransaction!.transaction_id}.`);
            }
            const carriedOverEntryData: CreateEntryInternalData = {
              account_id: originalPostedEntry.account_id, entry_type: originalPostedEntry.entry_type, amount: originalPostedEntry.amount, currency: originalPostedEntry.currency, status: EntryStatus.POSTED, effective_date: stagingEntry.effective_date,
              transaction_id: '', // Placeholder
              metadata: { ...(originalPostedEntry.metadata as Prisma.JsonObject || {}), derived_from_entry_id: originalPostedEntry.entry_id },
            };
            const newEvolvedTransaction = await transactionCore.createTransactionInternal(newTransactionShellData, fulfillingEntryData, carriedOverEntryData, tx);
            logger.info(`[ReconEngine] Created new evolved transaction ${newEvolvedTransaction.transaction_id} version ${newTransactionShellData.version}`);
            await tx.stagingEntry.update({
              where: { staging_entry_id: stagingEntry.staging_entry_id },
              data: { status: StagingEntryStatus.PROCESSED, discarded_at: new Date(), metadata: { ...(stagingEntry.metadata as Prisma.JsonObject|| {}), matched_transaction_id: originalTransaction!.transaction_id, matched_entry_id: matchedExpectedEntry.entry_id, evolved_transaction_id: newEvolvedTransaction.transaction_id, match_type: 'Phase2_Fulfilled' }},
            });
            logger.info(`[ReconEngine] Updated staging entry ${stagingEntry.staging_entry_id} to PROCESSED.`);
            return newEvolvedTransaction;
          });
        } else {
          logger.warn(`[ReconEngine] Mismatch for StagingEntry ${stagingEntry.staging_entry_id}: ${mismatchReason}`);
          await prisma.$transaction(async (tx) => {
            await tx.transaction.update({ where: { transaction_id: originalTransaction!.transaction_id }, data: { status: TransactionStatus.MISMATCH }});
            await tx.stagingEntry.update({ where: { staging_entry_id: stagingEntry.staging_entry_id }, data: { status: StagingEntryStatus.NEEDS_MANUAL_REVIEW, metadata: { ...(stagingEntry.metadata as Prisma.JsonObject || {}), error: mismatchReason, error_type: 'MismatchError', matched_transaction_id: originalTransaction!.transaction_id }}});
          });
          throw new Error(`Mismatch detected for staging_entry_id ${stagingEntry.staging_entry_id}: ${mismatchReason}`);
        }
      } else { 
        const noMatchReason = `No matching expected entry found for staging_entry_id ${stagingEntry.staging_entry_id} (CONFIRMATION mode). Staging entry requires manual review.`;
        logger.warn(`[ReconEngine] ${noMatchReason}`);
        await prisma.stagingEntry.update({
          where: { staging_entry_id: stagingEntry.staging_entry_id },
          data: { status: StagingEntryStatus.NEEDS_MANUAL_REVIEW, metadata: { ...(stagingEntry.metadata as Prisma.JsonObject || {}), error: noMatchReason, error_type: 'NoMatchFoundError' }},
        });
        const noMatchError = new Error(noMatchReason);
        noMatchError.name = 'NoMatchFoundError'; 
        throw noMatchError;
      }
    } else if (processingMode === StagingEntryProcessingMode.TRANSACTION) {
      logger.info(`[ReconEngine] Processing StagingEntry ${stagingEntry.staging_entry_id} in TRANSACTION mode.`);
      const [actualEntryData, expectedEntryData] = await generateTransactionEntriesFromStaging(stagingEntry, merchantId);
      
      const transactionShellData = {
        merchant_id: merchantId,
        status: TransactionStatus.EXPECTED,
        logical_transaction_id: (stagingEntry.metadata as Prisma.JsonObject)?.order_id as string || stagingEntry.staging_entry_id,
        version: 1,
        metadata: { ...(stagingEntry.metadata as Prisma.JsonObject || {}), source_staging_entry_id: stagingEntry.staging_entry_id, processing_mode: StagingEntryProcessingMode.TRANSACTION },
      };
      // This check is a bit redundant now as metadata.processing_mode is part of the shell data above.
      // if (transactionShellData.metadata.processing_mode && (stagingEntry.metadata as Prisma.JsonObject)?.processing_mode && transactionShellData.metadata.processing_mode !== (stagingEntry.metadata as Prisma.JsonObject).processing_mode) {
      //    transactionShellData.metadata.processing_mode = StagingEntryProcessingMode.TRANSACTION;
      // }

      const newTransaction = await transactionCore.createTransactionInternal(
        transactionShellData,
        actualEntryData,
        expectedEntryData
      );

      await prisma.stagingEntry.update({
        where: { staging_entry_id: stagingEntry.staging_entry_id },
        data: {
          status: StagingEntryStatus.PROCESSED,
          discarded_at: new Date(),
          metadata: { ...(stagingEntry.metadata as Prisma.JsonObject || {}), created_transaction_id: newTransaction.transaction_id, match_type: 'NewTransactionGenerated' },
        },
      });
      logger.info(`[ReconEngine] Successfully created new transaction ${newTransaction.transaction_id} from staging_entry_id ${stagingEntry.staging_entry_id} in TRANSACTION mode.`);
      return newTransaction;
    } else { 
      const errMsg = `[ReconEngine] Unknown processing_mode: ${processingMode} for staging_entry_id ${stagingEntry.staging_entry_id}`;
      logger.error(errMsg);
      await prisma.stagingEntry.update({
        where: { staging_entry_id: stagingEntry.staging_entry_id },
        data: { status: StagingEntryStatus.NEEDS_MANUAL_REVIEW, metadata: { ...(stagingEntry.metadata as Prisma.JsonObject || {}), error: `Invalid processing_mode: ${processingMode}`, error_type: 'InvalidProcessingModeError' }},
      });
      throw new Error(`Invalid processing_mode: ${processingMode}`);
    }
  } catch (error) {
    const err = error as Error;
    logger.error(`Error in processStagingEntryWithRecon for staging_entry_id ${stagingEntry.staging_entry_id} (Processing Mode: ${stagingEntry.processing_mode}): ${err.message}`, err);
    const currentMetadata = stagingEntry.metadata as Prisma.JsonObject || {};
    
    if (!(err.name === 'NoMatchFoundError' || err.message.startsWith('Ambiguous match') || err.message.startsWith('Mismatch detected'))) {
      try {
        await prisma.stagingEntry.update({
          where: { staging_entry_id: stagingEntry.staging_entry_id },
          data: { status: StagingEntryStatus.NEEDS_MANUAL_REVIEW, metadata: { ...currentMetadata, error: err.message, error_type: err.name || 'GenericError' } },
        });
        logger.log(`StagingEntry ${stagingEntry.staging_entry_id} marked as NEEDS_MANUAL_REVIEW due to ${err.name || 'GenericError'}.`);
      } catch (updateError: any) {
        const updErr = updateError as Error;
        logger.error(`Failed to update StagingEntry ${stagingEntry.staging_entry_id} status after ${err.name}: ${updErr.message}`, updErr);
      }
    }
    throw err; 
  }
}

export {
  generateTransactionEntriesFromStaging,
  // NoReconRuleFoundError, // Removed as it's already exported by class definition
  processStagingEntryWithRecon,
};
