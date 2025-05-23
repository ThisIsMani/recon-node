import { ProcessTracker } from '@prisma/client';
import { ReconTask, ReconTaskClass } from './task-interface';
import logger from '../../../../services/logger';

/**
 * Manages task implementations and routes tasks to the appropriate handler
 */
export class TaskManager {
  private taskClasses: ReconTaskClass[];

  /**
   * Creates a new TaskManager
   * @param taskClasses Array of task implementations to register
   */
  constructor(taskClasses: ReconTaskClass[]) {
    this.taskClasses = taskClasses;
    logger.info(`TaskManager initialized with ${taskClasses.length} task types`);
  }

  /**
   * Finds the appropriate task handler for a given process tracker task
   * @param task The process tracker task to handle
   * @returns A task handler instance or null if none can handle this task
   */
  public async findTaskForProcessTracker(task: ProcessTracker): Promise<ReconTask | null> {
    try {
      // Try each registered task class to see if it can handle this task
      for (const TaskClass of this.taskClasses) {
        try {
          const taskInstance = await TaskClass.decide(task);
          
          if (taskInstance) {
            logger.log(`Found task handler for task ${task.task_id}`);
            return taskInstance;
          }
        } catch (error) {
          logger.warn(`Error in task class decision logic: ${error instanceof Error ? error.message : String(error)}`);
          // Continue with the next task class
          continue;
        }
      }
      
      // If we get here, no handler could process this task
      logger.warn(`No task handler found for task ${task.task_id}`);
      return null;
    } catch (error) {
      logger.error(
        `Error finding task handler for task ${task.task_id}: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * Alias for findTaskForProcessTracker to maintain backward compatibility
   */
  public async findTaskHandler(task: ProcessTracker): Promise<ReconTask | null> {
    return this.findTaskForProcessTracker(task);
  }

  /**
   * Register a new task class with the task manager
   * @param taskClass The task class to register
   */
  public registerTaskClass(taskClass: ReconTaskClass): void {
    this.taskClasses.push(taskClass);
    logger.info(`New task class registered, total task types: ${this.taskClasses.length}`);
  }

  /**
   * Gets the list of registered task classes
   * @returns Array of task class types
   */
  public getRegisteredTaskClasses(): ReconTaskClass[] {
    return [...this.taskClasses];
  }
}
