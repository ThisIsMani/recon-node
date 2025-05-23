import { ProcessTracker, ProcessTaskStatus, ProcessTaskType, Prisma } from '@prisma/client';
import { TaskManager } from './task/task-manager';
import logger from '../../../services/logger';
import prisma from '../../../services/prisma';
import { ReconTask } from './task/task-interface';

/**
 * Delegates tasks to appropriate handlers and manages task lifecycle
 */
export class TaskDelegator {
  private taskManager: TaskManager;

  /**
   * Create a new TaskDelegator
   * @param taskManager The TaskManager to use for routing tasks
   */
  constructor(taskManager: TaskManager) {
    this.taskManager = taskManager;
  }

  /**
   * Process a single task from the process tracker queue
   * @returns true if a task was processed, false if no task was available
   */
  async processSingleTask(): Promise<boolean> {
    // Get a pending task
    const taskToProcess = await this.getNextPendingTask();
    if (!taskToProcess) {
      return false;
    }

    // Mark as processing
    await this.updateTaskStatus(taskToProcess.task_id, ProcessTaskStatus.PROCESSING);

    try {
      // Route the task to the appropriate handler using the task manager
      const taskHandler = await this.taskManager.findTaskHandler(taskToProcess);
      
      if (!taskHandler) {
        logger.warn(`No handler found for task ${taskToProcess.task_id} - marking as failed`);
        await this.updateTaskStatus(taskToProcess.task_id, ProcessTaskStatus.FAILED, 
          'No task handler found for this task type');
        return true;
      }
      
      // Execute the task through the handler
      const result = await this.executeTask(taskHandler, taskToProcess);
      
      // Mark as completed
      if (result.success) {
        await this.updateTaskStatus(taskToProcess.task_id, ProcessTaskStatus.COMPLETED);
        logger.info(`Task ${taskToProcess.task_id} completed successfully`);
      } else {
        await this.updateTaskStatus(taskToProcess.task_id, ProcessTaskStatus.FAILED, result.error);
        logger.warn(`Task ${taskToProcess.task_id} failed: ${result.error}`);
      }
      
      return true;
    } catch (error) {
      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.updateTaskStatus(taskToProcess.task_id, ProcessTaskStatus.FAILED, errorMessage);
      logger.error(`Unhandled error processing task ${taskToProcess.task_id}: ${errorMessage}`);
      
      return true;
    }
  }

  /**
   * Gets the next pending task from the database
   * @returns The next ProcessTracker task or null if none available
   */
  private async getNextPendingTask(): Promise<ProcessTracker | null> {
    try {
      // Get and lock a task atomically
      const task = await prisma.$transaction(async (tx) => {
        // Find the oldest pending task
        const pendingTask = await tx.processTracker.findFirst({
          where: {
            status: ProcessTaskStatus.PENDING,
            // Only process staging entry tasks for now
            task_type: ProcessTaskType.PROCESS_STAGING_ENTRY,
          },
          orderBy: { created_at: 'asc' },
        });

        if (!pendingTask) {
          return null;
        }

        // Lock it by updating its status - this makes the transaction exclusive
        return tx.processTracker.update({
          where: { task_id: pendingTask.task_id },
          data: {
            processing_started_at: new Date(),
            attempts: { increment: 1 },
          },
        });
      });

      return task;
    } catch (error) {
      logger.error(`Error getting next pending task: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Updates a task's status in the database
   * @param taskId The ID of the task to update
   * @param status The new status for the task
   * @param errorMessage Optional error message to include
   */
  private async updateTaskStatus(
    taskId: string, 
    status: ProcessTaskStatus,
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateData: Prisma.ProcessTrackerUpdateInput = {
        status,
        ...(status === ProcessTaskStatus.COMPLETED ? { completed_at: new Date() } : {}),
        ...(errorMessage ? { last_error: errorMessage } : {})
      };
      
      await prisma.processTracker.update({
        where: { task_id: taskId },
        data: updateData
      });
    } catch (error) {
      logger.error(
        `Error updating task ${taskId} status to ${status}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Executes a task using the provided handler
   * @param handler The task handler to use
   * @param task The process tracker task to execute
   * @returns Result of the operation
   */
  private async executeTask(
    handler: ReconTask,
    task: ProcessTracker
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate first
      const validationResult = await handler.validate();
      
      if (validationResult.isErr()) {
        return { 
          success: false, 
          error: `Validation error: ${validationResult.error.message}` 
        };
      }
      
      // Run the task
      const runResult = await handler.run();
      
      if (runResult.isErr()) {
        return { 
          success: false, 
          error: `Execution error: ${runResult.error.message}` 
        };
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: `Unhandled error: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
}
