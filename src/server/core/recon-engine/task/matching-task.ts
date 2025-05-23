import { ProcessTracker, StagingEntryProcessingMode, Prisma } from '@prisma/client';
import { Result, ok, err } from 'neverthrow';
import { BaseTask } from './base-task';
import { ReconTask, ReconTaskClass } from './task-interface';
import { AppError } from '../../../../errors/AppError';
import { StagingEntryWithAccount } from '../../../domain_models/staging_entry.types'; // Updated path
import { ProcessingError, ValidationError } from '../error';
import logger from '../../../../services/logger';
import prisma from '../../../../services/prisma';
import { findUniqueOrThrow } from '../../../../services/databaseHelpers';
import * as reconEngine from '../engine';

/**
 * Task implementation for processing staging entries in CONFIRMATION mode
 * Used for matching entries against transactions
 */
export class MatchingTask extends BaseTask implements ReconTask {
  /**
   * The staging entry being processed
   */
  private currentStagingEntry: StagingEntryWithAccount | null = null;

  /**
   * Factory method to create a MatchingTask instance if the process tracker task can be handled
   * @param processTrackerTask The process tracker task to evaluate
   * @returns A new MatchingTask instance if applicable, null otherwise
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
        select: { processing_mode: true, account_id: true }
      });
      
      if (!stagingEntryInfo || stagingEntryInfo.processing_mode !== StagingEntryProcessingMode.CONFIRMATION) {
        return null;
      }
      
      // Create the task and load the full staging entry
      const task = new MatchingTask(processTrackerTask);
      
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
      logger.error(errorMessage, { context: `MatchingTask.decide failed` });
      return null;
    }
  }

  /**
   * Validates that the staging entry is valid for confirmation matching
   */
  public async validate(): Promise<Result<void, AppError>> {
    logger.info(`Validating staging_entry_id ${this.getStagingEntryId()} for confirmation matching`);
    
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
    
    // Validate order_id exists in metadata for matching
    const metadata = this.currentStagingEntry.metadata as Record<string, any> || {};
    if (!metadata.order_id) {
      return err(new ValidationError('Missing order_id in metadata for confirmation matching', { 
        stagingEntryId: this.currentStagingEntry.staging_entry_id,
        taskId: this.taskId 
      }));
    }
    
    // Validate that there's a recon rule for this account
    const reconRule = await prisma.reconRule.findFirst({
      where: {
        OR: [
          { account_one_id: this.currentStagingEntry.account_id },
          { account_two_id: this.currentStagingEntry.account_id }
        ],
        merchant_id: this.currentStagingEntry.account.merchant_id
      }
    });
    
    if (!reconRule) {
      return err(new ValidationError('No reconciliation rule found for this account', { 
        stagingEntryId: this.currentStagingEntry.staging_entry_id,
        accountId: this.currentStagingEntry.account_id,
        merchantId: this.currentStagingEntry.account.merchant_id,
        taskId: this.taskId 
      }));
    }
    
    return ok(undefined);
  }

  /**
   * Processes the staging entry by matching it with existing transactions
   */
  public async run(): Promise<Result<any, AppError>> {
    // First ensure validation passes
    const validationResult = await this.validate();
    if (validationResult.isErr()) {
      return validationResult;
    }
    
    try {
      // Process the staging entry to match it with existing transactions
      const result = await reconEngine.processStagingEntryWithRecon(
        this.currentStagingEntry!,
        this.currentStagingEntry!.account!.merchant_id
      );
      
      const transactionId = result?.transaction_id || 'unknown';
      logger.info(`Successfully matched staging entry ${this.currentStagingEntry!.staging_entry_id} to transaction ${transactionId}`);
      return ok(result);
    } catch (error) {
      // Handle specific error cases
      if (error instanceof Error && error.name === 'NoMatchFoundError') {
        const appError = new ProcessingError(
          `No matching entry found for staging entry ${this.currentStagingEntry!.staging_entry_id}`,
          { 
            stagingEntryId: this.currentStagingEntry!.staging_entry_id,
            accountId: this.currentStagingEntry!.account_id,
            merchantId: this.currentStagingEntry!.account!.merchant_id,
            taskId: this.taskId,
            errorType: 'no_match' 
          }
        );
        logger.warn(appError.message, { 
          context: 'MatchingTask.run - NoMatchFoundError',
          stagingEntryId: this.currentStagingEntry!.staging_entry_id 
        });
        return err(appError);
      }
      
      // Handle other errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      const appError = new ProcessingError(
        `Failed to match staging entry ${this.currentStagingEntry!.staging_entry_id}: ${errorMessage}`,
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
export const MatchingTaskClass: ReconTaskClass = MatchingTask;
