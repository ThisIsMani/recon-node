const prisma = require('../../../services/prisma');
const { AccountType, EntryType, StagingEntryProcessingMode } = require('@prisma/client'); // Import Enums
const processTrackerCore = require('../process-tracker'); // Import the process tracker core logic
const csv = require('csv-parser'); // Import csv-parser
const { Readable } = require('stream'); // To stream from buffer

async function createStagingEntry(account_id, entryData) {
  const { entry_type, amount, currency, effective_date, metadata, discarded_at, processing_mode } = entryData; // Added processing_mode
  if (!entry_type || amount == null || !currency || !effective_date || !processing_mode) { // Added processing_mode to validation
    throw new Error('Missing required fields in body: entry_type, amount, currency, effective_date, processing_mode.');
  }
  if (!Object.values(StagingEntryProcessingMode).includes(processing_mode)) {
    throw new Error(`Invalid processing_mode. Must be one of: ${Object.values(StagingEntryProcessingMode).join(', ')}`);
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
        processing_mode, // Save processing_mode
        effective_date: new Date(effective_date),
        metadata: metadata || undefined,
        discarded_at: discarded_at ? new Date(discarded_at) : undefined,
        // status defaults to PENDING as per schema
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

async function ingestStagingEntriesFromFile(accountId, file, processingMode) { // Added processingMode parameter
  const results = [];
  const errors = [];
  let successfulIngestions = 0;
  let failedIngestions = 0;
  let rowNumber = 0; // To track original row numbers for error reporting

  // Step 6: Fetch Account Type
  let account;
  try {
    account = await prisma.account.findUnique({
      where: { account_id: accountId },
      select: { account_type: true, account_id: true } // Select necessary fields
    });
  } catch (dbError) {
    if (process.env.NODE_ENV !== 'test') {
      console.error(`Database error fetching account ${accountId}:`, dbError);
    }
    // Reject the promise, which will be caught by the route handler's catch block
    return Promise.reject(new Error(`Error fetching account details for ID ${accountId}.`));
  }

  if (!account) {
    // Reject the promise, route handler will convert to 404
    return Promise.reject(new Error(`Account with ID ${accountId} not found.`));
  }
  // Ensure account_type is present, as per prerequisite.
  // If not, this would be a schema/data issue.
  if (!account.account_type) {
    return Promise.reject(new Error(`Account type not defined for account ID ${accountId}. Please ensure schema and data are correct.`));
  }

  return new Promise((resolve, reject) => {
    const stream = Readable.from(file.buffer.toString('utf8'));

    stream
      .pipe(csv())
      .on('data', (data) => {
        rowNumber++;
        const currentErrors = [];
        
        // Validate presence of required fields
        const requiredFields = ['order_id', 'amount', 'currency', 'transaction_date', 'type'];
        for (const field of requiredFields) {
          // Use String() to handle cases where data[field] might be a number (e.g. amount if not quoted in CSV)
          // before trim, and check for null/undefined explicitly.
          if (data[field] == null || String(data[field]).trim() === '') { 
            currentErrors.push(`Missing required field: ${field}`);
          }
        }

        // Validate data types
        if (data.amount && isNaN(parseFloat(data.amount))) {
          currentErrors.push(`Invalid amount: '${data.amount}' is not a number.`);
        }
        if (data.transaction_date) {
          const date = new Date(data.transaction_date);
          if (isNaN(date.getTime())) {
            currentErrors.push(`Invalid transaction_date: '${data.transaction_date}' is not a valid date.`);
          }
        }
        if (data.type && !['Payment', 'Refund'].includes(data.type)) {
          currentErrors.push(`Invalid type: '${data.type}'. Must be 'Payment' or 'Refund'.`);
        }

        if (currentErrors.length > 0) {
          errors.push({
            row_number: rowNumber,
            error_details: currentErrors.join('; '),
            row_data: data,
          });
          failedIngestions++;
        } else {
          // Step 7: Determine EntryType (DEBIT/CREDIT)
          let determinedPrismaEntryType; // Use Prisma's EntryType enum
          if (account.account_type === AccountType.DEBIT_NORMAL) {
            if (data.type === 'Payment') {
              determinedPrismaEntryType = EntryType.DEBIT;
            } else if (data.type === 'Refund') {
              determinedPrismaEntryType = EntryType.CREDIT;
            }
          } else if (account.account_type === AccountType.CREDIT_NORMAL) {
            if (data.type === 'Payment') {
              determinedPrismaEntryType = EntryType.CREDIT;
            } else if (data.type === 'Refund') {
              determinedPrismaEntryType = EntryType.DEBIT;
            }
          }

          if (!determinedPrismaEntryType) {
            // This case should ideally not be hit if 'type' validation (Payment/Refund) is done
            // and account.account_type is always DEBIT/CREDIT.
            errors.push({
              row_number: rowNumber,
              error_details: `Could not determine EntryType for CSV type '${data.type}' and account type '${account.account_type}'.`,
              row_data: data,
            });
            failedIngestions++;
          } else {
            // Step 8: Construct StagingEntry Data
            const stagingEntryData = {
              account_id: accountId, // from function parameter
              entry_type: determinedPrismaEntryType, // Use the determined Prisma enum value
              amount: parseFloat(data.amount), // Ensure this is a number
              currency: data.currency,
              effective_date: new Date(data.transaction_date), // Ensure this is a Date object
              metadata: {
                order_id: data.order_id,
                source_file: file.originalname, 
              },
              processing_mode: processingMode, // Pass processingMode from parameter
              // 'status' will default to PENDING as per Prisma schema
            };
            results.push({ 
              row_number: rowNumber, 
              staging_entry_payload: stagingEntryData 
            });
          }
        }
      })
      .on('end', async () => { // Make this async to await createStagingEntry calls
        // Step 9: Create Staging Entries
        for (const item of results) { // 'results' contains { row_number, staging_entry_payload }
          try {
            await createStagingEntry(accountId, item.staging_entry_payload);
            successfulIngestions++;
          } catch (dbError) {
            if (process.env.NODE_ENV !== 'test') {
              console.error(`Error creating staging entry for row ${item.row_number}:`, dbError.message);
            }
            errors.push({
              row_number: item.row_number,
              error_details: `Failed to create staging entry in database: ${dbError.message}`,
              row_data: item.staging_entry_payload, // Show the payload that failed
            });
            failedIngestions++; // Increment failedIngestions for DB errors too
          }
        }
        
        if (process.env.NODE_ENV !== 'test') {
            console.log('CSV processing complete. Staging entries creation attempted.');
        }
        resolve({
          message: "File processing complete.",
          successful_ingestions: successfulIngestions,
          failed_ingestions: failedIngestions,
          errors: errors,
        });
      })
      .on('error', (error) => {
        if (process.env.NODE_ENV !== 'test') {
            console.error('Error parsing CSV:', error);
        }
        reject(new Error('Failed to parse CSV file.'));
      });
  });
}

module.exports = {
  createStagingEntry,
  listStagingEntries,
  ingestStagingEntriesFromFile, // Add the new function here
};
