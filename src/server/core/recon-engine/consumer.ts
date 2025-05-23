import prisma from '../../../services/prisma';
import * as processTrackerCore from '../process-tracker'; // Now TS
import * as reconEngine from './engine'; // Will be TS later
import { ProcessTaskStatus, ProcessTaskType, StagingEntryStatus, Prisma, StagingEntry, Account as PrismaAccount, ProcessTracker } from '@prisma/client'; // Added ProcessTracker
import logger from '../../../services/logger';

// Define a type for the task payload if it's consistent
interface ProcessStagingEntryPayload {
  staging_entry_id: string;
  // other potential fields in payload
}

// Type for StagingEntry with included Account (for merchant_id)
type StagingEntryWithAccount = StagingEntry & {
  account: { merchant_id: string } | null;
};


/**
 * Processes a single task from the ProcessTracker for staging entry reconciliation.
 * @returns {Promise<boolean>} True if a task was processed (successfully or unsuccessfully), false if no task was found.
 */
async function processSingleTask(): Promise<boolean> {
  let task: ProcessTracker | null = null; // Changed type from Prisma.ProcessTracker to ProcessTracker
  let stagingEntryId: string | undefined | null = null;

  try {
    task = await processTrackerCore.getNextPendingTask(ProcessTaskType.PROCESS_STAGING_ENTRY);

    if (!task) {
      return false; // No task was processed
    }

    // Type assertion for payload, ensuring it's an object and has the property
    if (task.payload && typeof task.payload === 'object' && !Array.isArray(task.payload) && 'staging_entry_id' in task.payload) {
      stagingEntryId = (task.payload as unknown as ProcessStagingEntryPayload).staging_entry_id;
    } else {
      // Handle cases where payload is not as expected or staging_entry_id is missing
      logger.error(`Recon Engine Consumer: Task ${task.task_id} has invalid or missing payload structure for staging_entry_id.`);
      await processTrackerCore.updateTaskStatus(task.task_id, ProcessTaskStatus.FAILED, { error_message: "Invalid or missing payload structure for staging_entry_id." });
      return true; // Task processed (failed)
    }
    
    logger.log(`Recon Engine Consumer: Processing task ${task.task_id} for staging_entry_id: ${stagingEntryId}`);
    await processTrackerCore.updateTaskStatus(task.task_id, ProcessTaskStatus.PROCESSING, { increment_attempt: true });

    if (!stagingEntryId) {
      logger.error(`Recon Engine Consumer: Task ${task.task_id} has no staging_entry_id in payload.`);
      await processTrackerCore.updateTaskStatus(task.task_id, ProcessTaskStatus.FAILED, { error_message: "Missing staging_entry_id in task payload." });
      return true; // Task processed (failed)
    }

    const stagingEntry = await prisma.stagingEntry.findUnique({
      where: { staging_entry_id: stagingEntryId },
      include: {
        account: { 
          select: { merchant_id: true }
        }
      }
    }) as StagingEntryWithAccount | null; // Type assertion for the include

    if (!stagingEntry) {
      logger.error(`Recon Engine Consumer: StagingEntry ${stagingEntryId} not found for task ${task.task_id}.`);
      await processTrackerCore.updateTaskStatus(task.task_id, ProcessTaskStatus.FAILED, { error_message: `StagingEntry ${stagingEntryId} not found.` });
      return true; // Task processed (failed)
    }

    if (!stagingEntry.account || !stagingEntry.account.merchant_id) {
      logger.error(`Recon Engine Consumer: Merchant ID not found for StagingEntry ${stagingEntryId} via account ${stagingEntry.account_id}.`);
      await processTrackerCore.updateTaskStatus(task.task_id, ProcessTaskStatus.FAILED, { error_message: `Merchant ID not found for StagingEntry ${stagingEntryId}.` });
      return true; // Task processed (failed)
    }
    
    logger.log(`Recon Engine Consumer: Fetched StagingEntry ${stagingEntry.staging_entry_id} with amount ${stagingEntry.amount}`);

    // reconEngine.processStagingEntryWithRecon is still JS, so its params might need `any` or specific JS-aligned types for now
    await reconEngine.processStagingEntryWithRecon(stagingEntry as any, stagingEntry.account.merchant_id);

    logger.log(`Recon Engine Consumer: Successfully processed task ${task.task_id} for staging_entry_id ${stagingEntryId}.`);
    await processTrackerCore.updateTaskStatus(task.task_id, ProcessTaskStatus.COMPLETED);
    return true; // Task processed successfully

  } catch (error: any) { // Catch as 'any' or 'unknown' then assert type
    const err = error as Error; // Type assertion
    const errorMessage = err.message || 'Unknown error during task processing.';
    const errorName = err.name || 'Error';
    const taskIdForLog = task ? task.task_id : 'UNKNOWN_TASK';
    
    // Safely access staging_entry_id from payload for logging
    let seIdForLogError = 'UNKNOWN_SE_IN_PAYLOAD';
    if (task?.payload && typeof task.payload === 'object' && !Array.isArray(task.payload) && 'staging_entry_id' in task.payload) {
      seIdForLogError = (task.payload as unknown as ProcessStagingEntryPayload).staging_entry_id || 'UNKNOWN_SE_ID_VALUE';
    }
    const finalSeIdForLog = stagingEntryId || seIdForLogError;

    logger.error(`Recon Engine Consumer: Error processing task ${taskIdForLog} for staging_entry_id ${finalSeIdForLog}. Error: ${errorName} - ${errorMessage}`, err.stack);
    
    if (task) {
      await processTrackerCore.updateTaskStatus(task.task_id, ProcessTaskStatus.FAILED, { 
        error_message: `${errorName}: ${errorMessage}` 
      });
    }
    return true; // Task processed (failed)
  }
}

/**
 * Starts the consumer loop that polls for and processes tasks.
 * @param defaultPollIntervalMs - Default polling interval in milliseconds.
 */
async function startConsumer(defaultPollIntervalMs = 1000): Promise<void> {
  const pollIntervalEnv = process.env.RECON_ENGINE_POLL_INTERVAL_MS;
  const pollIntervalMs = pollIntervalEnv ? parseInt(pollIntervalEnv, 10) : defaultPollIntervalMs;
  
  if (isNaN(pollIntervalMs) || pollIntervalMs <= 0) {
    logger.warn(`Invalid RECON_ENGINE_POLL_INTERVAL_MS: ${pollIntervalEnv}. Using default ${defaultPollIntervalMs}ms.`);
  }
  const finalPollInterval = (isNaN(pollIntervalMs) || pollIntervalMs <= 0) ? defaultPollIntervalMs : pollIntervalMs;


  logger.log(`Recon Engine Consumer: Starting... Polling every ${finalPollInterval / 1000} seconds.`);
  
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const processed = await processSingleTask();
      if (!processed) {
        await new Promise(resolve => setTimeout(resolve, finalPollInterval));
      }
    } catch (loopError: any) {
      const err = loopError as Error;
      logger.error('Recon Engine Consumer: Unhandled error in polling loop:', err.message, err.stack);
      await new Promise(resolve => setTimeout(resolve, finalPollInterval * 2)); 
    }
  }
}

export {
  processSingleTask,
  startConsumer,
};
