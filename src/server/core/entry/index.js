const prisma = require('../../../services/prisma');
const { EntryType, EntryStatus } = require('@prisma/client'); // Explicitly import enums

/**
 * Lists entries for a specific account, with optional filtering.
 * @param {string} accountId - The ID of the account.
 * @param {object} queryParams - Query parameters for filtering (e.g., status).
 * @returns {Promise<Array<Entry>>} A promise that resolves to an array of entries.
 */
const listEntries = async (accountId, queryParams) => {
  const { status } = queryParams;
  const whereClause = { account_id: accountId };

  if (status) {
    whereClause.status = status;
  }

  try {
    const entries = await prisma.entry.findMany({
      where: whereClause,
      include: {
        account: {
          select: {
            account_id: true,
            account_name: true,
            merchant_id: true
          }
        }
      },
      orderBy: {
        effective_date: 'desc'
      }
    });
    return entries;
  } catch (error) {
    // It's good practice to log the error and rethrow or handle it specifically
    console.error(`Error fetching entries for account ${accountId}:`, error);
    // Avoid exposing detailed Prisma errors directly to the client in a real app
    // For now, rethrow to be caught by a general error handler
    throw new Error('Could not retrieve entries.');
  }
};

/**
 * Creates a new entry internally. Not exposed via API.
 * Used by system processes like the Recon Engine.
 * @param {object} entryData - Data for the new entry.
 * @param {string} entryData.account_id - The ID of the account.
 * @param {string} [entryData.transaction_id] - Optional: The ID of the transaction this entry belongs to.
 * @param {string} entryData.entry_type - Type of entry (DEBIT/CREDIT from EntryType enum).
 * @param {Decimal} entryData.amount - Amount of the entry.
 * @param {string} entryData.currency - Currency code.
 * @param {string} entryData.status - Status of the entry (from EntryStatus enum).
 * @param {Date} entryData.effective_date - Effective date of the entry.
 * @param {object} [entryData.metadata] - Optional: JSON metadata.
 * @param {Date} [entryData.discarded_at] - Optional: Timestamp if entry is archived.
 * @returns {Promise<Entry>} The newly created entry object.
 */
const createEntryInternal = async (entryData) => {
  const {
    account_id,
    transaction_id,
    entry_type,
    amount,
    currency,
    status,
    effective_date,
    metadata,
    discarded_at,
  } = entryData;

  // Basic validation
  if (!account_id || !entry_type || amount == null || !currency || !status || !effective_date) {
    throw new Error('Missing required fields for internal entry creation: account_id, entry_type, amount, currency, status, effective_date.');
  }
  if (!EntryType[entry_type]) { // Use imported enum
    throw new Error(`Invalid entry_type: ${entry_type}`);
  }
  if (!EntryStatus[status]) { // Use imported enum
    throw new Error(`Invalid entry status: ${status}`);
  }
  // Basic validation for account existence
  const account = await prisma.account.findUnique({ where: { account_id } });
  if (!account) {
    throw new Error(`Account with ID ${account_id} not found for internal entry creation.`);
  }
  // Optional: Validate transaction_id if provided
  if (transaction_id) {
    const transaction = await prisma.transaction.findUnique({ where: { transaction_id } });
    if (!transaction) {
      throw new Error(`Transaction with ID ${transaction_id} not found for internal entry creation.`);
    }
  }

  try {
    const newEntry = await prisma.entry.create({
      data: {
        account_id,
        transaction_id,
        entry_type,
        amount,
        currency,
        status,
        effective_date: new Date(effective_date),
        metadata,
        discarded_at: discarded_at ? new Date(discarded_at) : undefined,
      },
    });
    return newEntry;
  } catch (error) {
    console.error(`Error creating internal entry for account ${account_id}:`, error);
    throw new Error('Could not create internal entry.');
  }
};

module.exports = {
  listEntries,
  createEntryInternal, // Exporting for use by other core modules
};
