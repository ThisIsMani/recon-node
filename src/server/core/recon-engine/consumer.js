// Recon Engine Consumer Logic

const prisma = require('../../../services/prisma');
const processTrackerCore = require('../process-tracker');
const stagingEntryCore = require('../staging-entry'); // May not be needed directly if payload has all info
const transactionCore = require('../transaction'); // For internal createTransaction
const entryCore = require('../entry'); // For internal createEntry

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
  try {
    task = await processTrackerCore.getNextPendingTask(prisma.ProcessTaskType.PROCESS_STAGING_ENTRY);

    if (!task) {
      // console.log('Recon Engine Consumer: No pending tasks found.');
      return false; // No task was processed
    }

    console.log(`Recon Engine Consumer: Processing task ${task.task_id} for staging_entry_id: ${task.payload.staging_entry_id}`);
    await processTrackerCore.updateTaskStatus(task.task_id, prisma.ProcessTaskStatus.PROCESSING, { increment_attempt: true });

    const stagingEntryId = task.payload.staging_entry_id;
    if (!stagingEntryId) {
      console.error(`Recon Engine Consumer: Task ${task.task_id} has no staging_entry_id in payload.`);
      await processTrackerCore.updateTaskStatus(task.task_id, prisma.ProcessTaskStatus.FAILED, { error_message: "Missing staging_entry_id in task payload." });
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
      console.error(`Recon Engine Consumer: StagingEntry ${stagingEntryId} not found for task ${task.task_id}.`);
      // This could be a permanent failure for this task, or data consistency issue.
      await processTrackerCore.updateTaskStatus(task.task_id, prisma.ProcessTaskStatus.FAILED, { error_message: `StagingEntry ${stagingEntryId} not found.` });
      return false; 
    }

    console.log(`Recon Engine Consumer: Fetched StagingEntry ${stagingEntry.staging_entry_id} with amount ${stagingEntry.amount}`);

    // Prepare data for Transaction and Entry creation
    const transactionShellData = {
      merchant_id: stagingEntry.account.merchant_id,
      status: prisma.TransactionStatus.POSTED, // Defaulting to POSTED for now
      // logical_transaction_id and version will use Prisma defaults
      metadata: stagingEntry.metadata || {},
    };

    const entriesData = [
      {
        account_id: stagingEntry.account_id,
        entry_type: stagingEntry.entry_type,
        amount: stagingEntry.amount,
        currency: stagingEntry.currency,
        status: prisma.EntryStatus.POSTED, // Defaulting to POSTED for now
        effective_date: stagingEntry.effective_date,
        metadata: stagingEntry.metadata || {},
      },
    ];
    
    // TODO: Add more sophisticated logic for deriving multiple entries or different statuses based on ReconRules.
    // TODO: Add balancing logic check (deferred to createTransactionInternal or a later stage).

    const newTransactionWithEntries = await transactionCore.createTransactionInternal(transactionShellData, entriesData);
    console.log(`Recon Engine Consumer: Created new Transaction ${newTransactionWithEntries.transaction_id} with ${newTransactionWithEntries.entries.length} entries.`);

    // Update StagingEntry status to PROCESSED
    await prisma.stagingEntry.update({
      where: { staging_entry_id: stagingEntryId },
      data: { status: prisma.StagingEntryStatus.PROCESSED },
    });
    console.log(`Recon Engine Consumer: Marked StagingEntry ${stagingEntryId} as PROCESSED.`);
    
    console.log(`Recon Engine Consumer: Successfully processed task ${task.task_id}`);
    await processTrackerCore.updateTaskStatus(task.task_id, prisma.ProcessTaskStatus.COMPLETED);
    return true; // A task was processed

  } catch (error) {
    console.error(`Recon Engine Consumer: Error processing task ${task ? task.task_id : 'UNKNOWN'}. Error: ${error.message}`, error);
    if (task) {
      // Basic error handling: Mark task as FAILED after a certain number of retries (e.g., 3)
      // More sophisticated retry logic (e.g., exponential backoff) can be added later.
      const maxAttempts = 3; // Configurable
      if (task.attempts >= maxAttempts) {
        await processTrackerCore.updateTaskStatus(task.task_id, prisma.ProcessTaskStatus.FAILED, { error_message: error.message });
      } else {
        // If attempts < maxAttempts, it might have already been incremented by PROCESSING, or we can set to RETRY here.
        // For simplicity, if updateTaskStatus to PROCESSING incremented, it will be picked up again.
        // Or, explicitly set to RETRY if that's the desired flow.
        // Current getNextPendingTask fetches PENDING or RETRY.
        // Let's assume for now that if it fails before COMPLETED, it remains PROCESSING or needs manual reset/retry status.
        // A robust system would set it to RETRY with a delay.
        // For now, just log and it might be picked up again if not terminal.
        // If updateTaskStatus to PROCESSING failed, it would still be PENDING/RETRY.
        // If it failed after PROCESSING, it's stuck in PROCESSING.
        // Let's ensure it goes to FAILED or RETRY.
        // The current `updateTaskStatus` for PROCESSING increments attempt.
        // If it fails after that, it will be picked up again by `getNextPendingTask` if its status is RETRY.
        // Let's ensure it's marked as FAILED if attempts are exhausted.
         await processTrackerCore.updateTaskStatus(task.task_id, prisma.ProcessTaskStatus.FAILED, { error_message: error.message }); // Simplified: mark as FAILED directly
      }
    }
    return false; // A task was attempted but failed
  }
}


// Renamed processTasks to processSingleTask, startConsumer will loop
async function startConsumer(pollIntervalMs = 5000) { // Poll every 5 seconds by default
  console.log(`Recon Engine Consumer: Starting... Polling every ${pollIntervalMs / 1000} seconds.`);
  
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
      console.error('Recon Engine Consumer: Unhandled error in polling loop:', loopError);
      // Avoid fast spinning on unhandled errors in the loop itself
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs * 2)); 
    }
  }
}

module.exports = {
  processSingleTask, // Exporting for potential direct invocation or testing
  startConsumer,
};
