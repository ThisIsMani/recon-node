import { ProcessTracker } from '@prisma/client';
import { Result } from 'neverthrow';
import { AppError } from '../../../../errors/AppError';

/**
 * Interface that all recon tasks must implement.
 * Tasks are responsible for validating and executing specific types of recon operations.
 */
export interface ReconTask {
  /**
   * Validates the task data before execution
   * @returns A Result containing void if validation succeeds, or an AppError if validation fails
   */
  validate(): Promise<Result<void, AppError>>;
  
  /**
   * Runs the task after validation has passed
   * @returns A Result containing task output data if successful, or an AppError if execution fails
   */
  run(): Promise<Result<any, AppError>>;
}

/**
 * Interface for task class factories that can decide if they can handle a given process tracker task
 */
export interface ReconTaskClass {
  /**
   * Factory method that determines if this task class can handle the given process tracker task
   * @param processTrackerTask The process tracker task to evaluate
   * @returns A Promise resolving to a new task instance if applicable, null otherwise
   */
  decide(processTrackerTask: ProcessTracker): Promise<ReconTask | null>;
}
