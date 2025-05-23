import logger from '../../../services/logger';
import { TaskDelegator } from './task-delegator';
import { TaskManager } from './task';
import { TransactionTaskClass, MatchingTaskClass } from './task';

let isRunning = false;
let taskDelegator: TaskDelegator | null = null;

// Initialize the task delegator - this is now done lazily to support testing
function getTaskDelegator(): TaskDelegator {
  if (!taskDelegator) {
    taskDelegator = new TaskDelegator(
      new TaskManager([
        TransactionTaskClass,
        MatchingTaskClass
      ])
    );
  }
  return taskDelegator;
}

/**
 * Process a single task from the queue
 * Delegates to the TaskDelegator
 * @returns true if a task was processed, false if no task was available
 */
export async function processSingleTask(): Promise<boolean> {
  return getTaskDelegator().processSingleTask();
}

/**
 * Starts the recon engine consumer polling loop
 * @param pollingIntervalMs Polling interval in milliseconds for checking for new tasks
 */
export async function startConsumer(defaultPollingIntervalMs: number = 2000): Promise<void> {
  if (isRunning) {
    logger.warn('Recon Engine Consumer: Already running, ignoring duplicate start request');
    return;
  }
  
  isRunning = true;
  
  // Allow overriding polling interval through environment variables
  let pollingIntervalMs = defaultPollingIntervalMs;
  const envPollingInterval = process.env.RECON_ENGINE_POLL_INTERVAL_MS;
  
  if (envPollingInterval) {
    const parsedInterval = parseInt(envPollingInterval, 10);
    if (isNaN(parsedInterval) || parsedInterval <= 0) {
      logger.warn(`Invalid RECON_ENGINE_POLL_INTERVAL_MS: ${envPollingInterval}. Using default ${defaultPollingIntervalMs}ms.`);
    } else {
      pollingIntervalMs = parsedInterval;
    }
  }
  
  logger.info(`Recon Engine Consumer: Starting... Polling every ${pollingIntervalMs / 1000} seconds.`);
  
  // Start the polling loop
  await poll();
  
  // Poll function - extracted to support testing
  async function poll() {
    try {
      // Process tasks until none are left
      const processed = await processSingleTask();

      // If no task was processed, wait the full polling interval
      // before checking again
      const sleepTime = processed ? 0 : pollingIntervalMs;
      
      if (sleepTime > 0 && isRunning) {
        // Sleep before checking for new tasks
        setTimeout(poll, sleepTime);
      } else if (isRunning) {
        // Process more tasks immediately
        setImmediate(poll);
      }
    } catch (error) {
      // Convert unknown error to a string or Error object
      const errorMessage = error instanceof Error ? error : new Error(String(error));
      
      // Log and continue with doubled polling interval in case of errors
      logger.error(errorMessage, { context: 'Recon Engine Consumer: Unhandled error in polling loop' });
      
      if (isRunning) {
        setTimeout(poll, pollingIntervalMs * 2);
      }
    }
  }
}

/**
 * Stops the recon engine consumer polling
 */
export function stopConsumer(): void {
  if (!isRunning) {
    logger.warn('Recon Engine Consumer: Not running, ignoring stop request');
    return;
  }
  
  isRunning = false;
  logger.info('Recon Engine Consumer: Stopping...');
}

// For testing
export function resetConsumer(): void {
  isRunning = false;
  taskDelegator = null;
}
