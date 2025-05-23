import { ProcessTracker } from '@prisma/client';
import { Result, ok, err } from 'neverthrow';
import { AppError } from '../../../../errors/AppError';
import { StagingEntryStatusUpdate } from '../../../api_models/staging_entry.types'; // Updated path
import { ProcessingError, ValidationError } from '../error';
import logger from '../../../../services/logger';
import prisma from '../../../../services/prisma';

/**
 * Base abstract class for all recon engine tasks
 * Provides common functionality for tasks that process staging entries
 */
export abstract class BaseTask {
  protected processTrackerTask: ProcessTracker;
  protected taskId: string;

  /**
   * Creates a new instance of a task with the given process tracker
   * @param processTrackerTask The process tracker task being executed
   */
  constructor(processTrackerTask: ProcessTracker) {
    this.processTrackerTask = processTrackerTask;
    this.taskId = processTrackerTask.task_id;
    
    logger.log(`Initialized task ${this.constructor.name} for process tracker ${this.taskId}`);
  }

  /**
   * Returns the staging entry ID from the process tracker
   * @returns The staging entry ID, or throws if it doesn't exist
   */
  protected getStagingEntryId(): string {
    const payload = this.processTrackerTask.payload as Record<string, any>;
    
    if (!payload || !payload.staging_entry_id) {
      throw new ProcessingError(
        `Missing staging_entry_id in task payload for process tracker ${this.taskId}`,
        { taskId: this.taskId }
      );
    }
    
    return payload.staging_entry_id;
  }

  /**
   * Updates the status of a staging entry
   * @param stagingEntryId ID of the staging entry to update
   * @param update Status and metadata updates to apply
   * @returns The updated staging entry
   */
  protected async updateStagingEntryStatus(
    stagingEntryId: string,
    update: StagingEntryStatusUpdate
  ): Promise<Result<any, AppError>> {
    try {
      const { status, metadata = {}, discarded_at } = update;
      
      const updatedEntry = await prisma.stagingEntry.update({
        where: { staging_entry_id: stagingEntryId },
        data: {
          status,
          metadata: { ...metadata } as any,
          ...(discarded_at !== undefined ? { discarded_at } : {})
        }
      });
      
      logger.log(`Updated staging entry ${stagingEntryId} status to ${status}`);
      return ok(updatedEntry);
    } catch (error) {
      const appError = new ProcessingError(
        `Failed to update staging entry ${stagingEntryId} status: ${error instanceof Error ? error.message : String(error)}`,
        { stagingEntryId, taskId: this.taskId }
      );
      
      logger.error(appError);
      return err(appError);
    }
  }

  /**
   * Performs validation steps before the task is run
   * @returns Success result if validation passes, error result if it fails
   */
  public abstract validate(): Promise<Result<void, AppError>>;

  /**
   * Runs the task after validation has passed
   * @returns Success result with output data if successful, error result if it fails
   */
  public abstract run(): Promise<Result<any, AppError>>;
}
