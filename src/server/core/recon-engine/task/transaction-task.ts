import { ProcessTracker, StagingEntryProcessingMode, Prisma } from '@prisma/client';
import { Result, ok, err } from 'neverthrow';
import { BaseTask } from './base-task';
import { ReconTask, ReconTaskClass } from './task-interface';
import { AppError } from '../../../../errors/AppError';
import { StagingEntryWithAccount } from '../../../domain_models/staging_entry.types'; // Corrected path
import { ProcessingError, ValidationError } from '../error';
import logger from '../../../../services/logger';
import prisma from '../../../../services/prisma';
import { findUniqueOrThrow } from '../../../../services/databaseHelpers';
import * as reconEngine from '../engine';

/**
 * Task implementation for processing staging entries in TRANSACTION mode
 */
export class TransactionTask extends BaseTask implements ReconTask {
  /**
   * The staging entry being processed
   */
  private currentStagingEntry: StagingEntryWithAccount | null = null;

  /**
   * Factory method to create a TransactionTask instance if the process tracker task can be handled
   * @param processTrackerTask The process tracker task to evaluate
   * @returns A new TransactionTask instance if applicable, null otherwise
   */
  static async decide(processTrackerTask: ProcessTracker): Promise<ReconTask | null> {
    try {
      const payload = processTrackerTask.payload as Record<string, any>;
      if (!payload || !payload.staging_entry_id) {
        logger.warn(`ProcessTracker ${processTrackerTask.task_id} missing staging_entry_id in payload`);
        return null;
      }

      const stagingEntryId = payload.staging_entry_id;
      
      // First do a quick check to see if this is the right type of staging entry
      const stagingEntryInfo = await prisma.stagingEntry.findUnique({
        where: { staging_entry_id: stagingEntryId },
        select: { processing_mode: true }
      });
      
      if (!stagingEntryInfo || stagingEntryInfo.processing_mode !== StagingEntryProcessingMode.TRANSACTION) {
        return null;
      }
      
      // Create the task and load the full staging entry
      const task = new TransactionTask(processTrackerTask);
      
      // Load the staging entry with account
      const stagingEntry = await findUniqueOrThrow<StagingEntryWithAccount>(
        'StagingEntry' as Prisma.ModelName,
        {
          where: { staging_entry_id: stagingEntryId },
          // @ts-ignore - The Prisma query will support include even if TypeScript definition doesn't
          include: { account: true }
        },
        'StagingEntry',
        stagingEntryId
      );
      
      task.currentStagingEntry = stagingEntry;
      
      return task;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(errorMessage, { context: `TransactionTask.decide failed` });
      return null;
    }
  }

  /**
   * Validates that the staging entry is valid for transaction processing
   */
  public async validate(): Promise<Result<void, AppError>> {
    logger.info(`Validating staging_entry_id ${this.getStagingEntryId()} for transaction processing`);
    
    if (!this.currentStagingEntry) {
      return err(new ProcessingError('Task not properly initialized, missing staging entry', { taskId: this.taskId }));
    }
    
    // Validate that account_id exists
    if (!this.currentStagingEntry.account_id) {
      return err(new ValidationError('Staging entry missing account_id', { 
        stagingEntryId: this.currentStagingEntry.staging_entry_id,
        taskId: this.taskId 
      }));
    }
    
    // Validate account exists and merchant_id is available
    if (!this.currentStagingEntry.account || !this.currentStagingEntry.account.merchant_id) {
      return err(new ValidationError('Merchant ID not found for staging entry', { 
        stagingEntryId: this.currentStagingEntry.staging_entry_id,
        accountId: this.currentStagingEntry.account_id,
        taskId: this.taskId 
      }));
    }
    
    // Validate currency match between staging entry and account
    logger.log(`TransactionTask: Validating currency - staging entry: ${this.currentStagingEntry.currency}, account: ${this.currentStagingEntry.account.currency}`);
    if (this.currentStagingEntry.currency !== this.currentStagingEntry.account.currency) {
      // Update staging entry status to NEEDS_MANUAL_REVIEW
      const updateResult = await this.updateStagingEntryStatus(
        this.currentStagingEntry.staging_entry_id,
        {
          status: 'NEEDS_MANUAL_REVIEW',
          metadata: {
            ...(this.currentStagingEntry.metadata as object || {}),
            manual_review_reason: 'Currency mismatch between staging entry and account',
            staging_entry_currency: this.currentStagingEntry.currency,
            account_currency: this.currentStagingEntry.account.currency
          }
        }
      );
      
      if (updateResult.isErr()) {
        logger.error(`Failed to update staging entry status: ${updateResult.error.message}`);
      }
      
      return err(new ValidationError('Currency mismatch between staging entry and account', { 
        stagingEntryId: this.currentStagingEntry.staging_entry_id,
        stagingEntryCurrency: this.currentStagingEntry.currency,
        accountCurrency: this.currentStagingEntry.account.currency,
        accountId: this.currentStagingEntry.account_id,
        taskId: this.taskId 
      }));
    }
    
    return ok(undefined);
  }

  /**
   * Processes the staging entry by creating a transaction
   */
  public async run(): Promise<Result<any, AppError>> {
    // First ensure validation passes
    const validationResult = await this.validate();
    if (validationResult.isErr()) {
      return validationResult;
    }
    
    try {
      // Process the staging entry to create a transaction
      const result = await reconEngine.processStagingEntryWithRecon(
        this.currentStagingEntry!,
        this.currentStagingEntry!.account!.merchant_id
      );
      
      const transactionId = result?.transaction_id || 'unknown';
      logger.info(`Successfully processed staging entry ${this.currentStagingEntry!.staging_entry_id} into transaction ${transactionId}`);
      return ok(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const appError = new ProcessingError(
        `Failed to process transaction for staging entry ${this.currentStagingEntry!.staging_entry_id}: ${errorMessage}`,
        { 
          stagingEntryId: this.currentStagingEntry!.staging_entry_id,
          accountId: this.currentStagingEntry!.account_id,
          merchantId: this.currentStagingEntry!.account!.merchant_id,
          taskId: this.taskId 
        }
      );
      
      logger.error(appError);
      return err(appError);
    }
  }
}

// Register with the ReconTaskClass interface for use with TaskManager
export const TransactionTaskClass: ReconTaskClass = TransactionTask;
