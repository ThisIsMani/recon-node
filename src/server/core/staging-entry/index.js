const prisma = require('../../../services/prisma');
const processTrackerCore = require('../process-tracker'); // Import the process tracker core logic

async function createStagingEntry(account_id, entryData) {
  const { entry_type, amount, currency, effective_date, metadata, discarded_at } = entryData;
  if (!entry_type || amount == null || !currency || !effective_date) {
    throw new Error('Missing required fields in body: entry_type, amount, currency, effective_date.');
  }
  const account = await prisma.account.findUnique({ where: { account_id } });
  if (!account) {
    throw new Error(`Account with ID ${account_id} not found.`);
  }
  try {
    const newEntry = await prisma.stagingEntry.create({
      data: {
        account_id,
        entry_type,
        amount,
        currency,
        effective_date: new Date(effective_date),
        metadata: metadata || undefined,
        discarded_at: discarded_at ? new Date(discarded_at) : undefined,
        // status defaults to NEEDS_MANUAL_REVIEW as per schema
      },
    });

    // After successful StagingEntry creation, create a task for the recon engine
    try {
      await processTrackerCore.createTask(
        'PROCESS_STAGING_ENTRY', // Correctly reference the enum value as a string
        { staging_entry_id: newEntry.staging_entry_id }
      );
      if (process.env.NODE_ENV !== 'test') {
        console.log(`Task created for staging_entry_id: ${newEntry.staging_entry_id}`);
      }
    } catch (taskError) {
      // Log the error but don't let task creation failure roll back staging entry creation
      // This is a critical decision: should it throw? For now, we'll log and continue.
      // Consider a more robust error handling/retry mechanism for task creation in the future.
      console.error(`Failed to create process tracker task for staging_entry_id ${newEntry.staging_entry_id}:`, taskError);
      // Optionally, you might want to flag this staging entry for manual review or add to a separate dead-letter queue for tasks.
    }

    return newEntry;
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error creating staging entry:', error);
    }
    // Check for Prisma validation errors (e.g., invalid enum for entry_type)
    if (error.name === 'PrismaClientValidationError' || (error.code && error.code.startsWith('P2'))) {
        throw new Error(`Invalid input for staging entry creation. Details: ${error.message.split('\\n').slice(-2).join(' ')}`);
    }
    throw new Error('Could not create staging entry.');
  }
}

async function listStagingEntries(account_id, queryParams = {}) {
  const whereClause = { account_id };
  if (queryParams.status) {
    whereClause.status = queryParams.status;
  }
  // Add other potential filters from queryParams here if needed

  try {
    const entries = await prisma.stagingEntry.findMany({
      where: whereClause,
      include: {
        account: {
          select: { account_name: true, merchant_id: true }
        }
      }
    });
    return entries;
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error listing staging entries:', error);
    }
    throw new Error('Could not list staging entries.');
  }
}

module.exports = {
  createStagingEntry,
  listStagingEntries,
};
