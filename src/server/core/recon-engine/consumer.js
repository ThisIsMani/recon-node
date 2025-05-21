// Recon Engine Consumer Logic

const prisma = require('../../../services/prisma');
const processTrackerCore = require('../process-tracker');
// const stagingEntryCore = require('../staging-entry'); // No longer directly needed for status updates
// const transactionCore = require('../transaction'); // No longer directly needed
// const entryCore = require('../entry'); // No longer directly needed
const reconEngine = require('./engine'); // Import the recon engine
const { ProcessTaskStatus, ProcessTaskType, StagingEntryStatus } = require('@prisma/client'); // Import enums
const logger = require('../../../services/logger');

/**
 * Placeholder for the main consumer processing loop.
 * This function will be responsible for:
 * 1. Fetching pending tasks from ProcessTracker.
 * 2. Processing each task (transforming StagingEntry to Entry/Transaction).
 * 3. Updating task status in ProcessTracker.
 * 4. Handling errors and retries.
 */
async function processSingleTask() {
  let task = null;
  let stagingEntryId = null; // Keep stagingEntryId in scope for error logging

  try {
    task = await processTrackerCore.getNextPendingTask(ProcessTaskType.PROCESS_STAGING_ENTRY);

    if (!task) {
      // console.log('Recon Engine Consumer: No pending tasks found.');
      return false; // No task was processed
    }

    stagingEntryId = task.payload?.staging_entry_id; // Use optional chaining

    logger.log(`Recon Engine Consumer: Processing task ${task.task_id} for staging_entry_id: ${stagingEntryId}`);
    await processTrackerCore.updateTaskStatus(task.task_id, ProcessTaskStatus.PROCESSING, { increment_attempt: true });

    if (!stagingEntryId) {
      logger.error(`Recon Engine Consumer: Task ${task.task_id} has no staging_entry_id in payload.`);
      await processTrackerCore.updateTaskStatus(task.task_id, ProcessTaskStatus.FAILED, { error_message: "Missing staging_entry_id in task payload." });
      return false; // Critical error with task payload
    }

    const stagingEntry = await prisma.stagingEntry.findUnique({
      where: { staging_entry_id: stagingEntryId },
      include: {
        account: { // Ensure merchant_id is available via account
          select: { merchant_id: true }
        }
      }
    });

    if (!stagingEntry) {
      logger.error(`Recon Engine Consumer: StagingEntry ${stagingEntryId} not found for task ${task.task_id}.`);
      await processTrackerCore.updateTaskStatus(task.task_id, ProcessTaskStatus.FAILED, { error_message: `StagingEntry ${stagingEntryId} not found.` });
      return false;
    }

    if (!stagingEntry.account || !stagingEntry.account.merchant_id) {
      logger.error(`Recon Engine Consumer: Merchant ID not found for StagingEntry ${stagingEntryId} via account ${stagingEntry.account_id}.`);
      await processTrackerCore.updateTaskStatus(task.task_id, ProcessTaskStatus.FAILED, { error_message: `Merchant ID not found for StagingEntry ${stagingEntryId}.` });
      return false;
    }
    
    logger.log(`Recon Engine Consumer: Fetched StagingEntry ${stagingEntry.staging_entry_id} with amount ${stagingEntry.amount}`);

    // Call the new central processing function in reconEngine
    // This function will handle its own errors and update StagingEntry status accordingly
    await reconEngine.processStagingEntryWithRecon(stagingEntry, stagingEntry.account.merchant_id);

    // If processStagingEntryWithRecon completes without throwing an error,
    // it means the StagingEntry was processed and its status updated to PROCESSED.
    // Now, update the ProcessTracker task to COMPLETED.
    logger.log(`Recon Engine Consumer: Successfully processed task ${task.task_id} for staging_entry_id ${stagingEntryId}.`);
    await processTrackerCore.updateTaskStatus(task.task_id, ProcessTaskStatus.COMPLETED);
    return true; // A task was processed successfully

  } catch (error) {
    // This catch block now handles errors re-thrown by processStagingEntryWithRecon
    // or errors from fetching task/stagingEntry, or updating task status.
    const errorMessage = error.message || 'Unknown error during task processing.';
    const errorName = error.name || 'Error';
    logger.error(`Recon Engine Consumer: Error processing task ${task ? task.task_id : 'UNKNOWN'} for staging_entry_id ${stagingEntryId || task?.payload?.staging_entry_id || 'UNKNOWN'}. Error: ${errorName} - ${errorMessage}`, error.stack);
    
    if (task) {
      // StagingEntry status (NEEDS_MANUAL_REVIEW) is handled by processStagingEntryWithRecon.
      // Consumer's responsibility is to update the ProcessTracker task.
      await processTrackerCore.updateTaskStatus(task.task_id, ProcessTaskStatus.FAILED, { 
        error_message: `${errorName}: ${errorMessage}` 
      });
    }
    return false; // A task was attempted but failed
  }
}


// Renamed processTasks to processSingleTask, startConsumer will loop
async function startConsumer(defaultPollIntervalMs = 1000) { // Poll every 1 second by default
  const pollIntervalMs = parseInt(process.env.RECON_ENGINE_POLL_INTERVAL_MS, 10) || defaultPollIntervalMs;
  logger.log(`Recon Engine Consumer: Starting... Polling every ${pollIntervalMs / 1000} seconds.`);
  
  // Indefinite loop for polling
  // In a real scenario, this needs a proper shutdown mechanism.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const processed = await processSingleTask();
      if (!processed) {
        // If no task was found and processed, wait for the poll interval.
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      }
      // If a task was processed, loop again immediately to check for more tasks.
    } catch (loopError) {
      logger.error('Recon Engine Consumer: Unhandled error in polling loop:', loopError);
      // Avoid fast spinning on unhandled errors in the loop itself
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs * 2)); 
    }
  }
}

module.exports = {
  processSingleTask, // Exporting for potential direct invocation or testing
  startConsumer,
};
