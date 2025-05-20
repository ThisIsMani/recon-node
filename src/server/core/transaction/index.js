const prisma = require('../../../services/prisma');

class BalanceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BalanceError';
  }
}
const entryCore = require('../entry'); // Import entry core logic for createEntryInternal

/**
 * Lists transactions for a specific merchant, with optional filtering.
 * @param {string} merchantId - The ID of the merchant.
 * @param {object} queryParams - Query parameters for filtering (e.g., status).
 * @returns {Promise<Array<Transaction>>} A promise that resolves to an array of transactions.
 */
const listTransactions = async (merchantId, queryParams) => {
  const { status, logical_transaction_id, version } = queryParams;
  const whereClause = { merchant_id: merchantId };

  if (status) {
    whereClause.status = status;
  }
  if (logical_transaction_id) {
    whereClause.logical_transaction_id = logical_transaction_id;
  }
  if (version) {
    whereClause.version = parseInt(version, 10); // Ensure version is an integer
  }

  try {
    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        // merchant: true, // Optional: include merchant details if needed
        entries: {        // Include related entries
          select: {
            entry_id: true,
            account_id: true,
            entry_type: true,
            amount: true,
            currency: true,
            status: true,
            effective_date: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    return transactions;
  } catch (error) {
    console.error(`Error fetching transactions for merchant ${merchantId}:`, error);
    throw new Error('Could not retrieve transactions.');
  }
};

/**
 * Creates a new transaction internally, along with its associated entries.
 * Used by system processes like the Recon Engine.
 * @param {object} transactionShellData - Data for the transaction shell.
 * @param {string} transactionShellData.merchant_id - The ID of the merchant.
 * @param {string} transactionShellData.status - The status of the transaction (from TransactionStatus enum).
 * @param {string} [transactionShellData.logical_transaction_id] - Optional: The logical ID.
 * @param {number} [transactionShellData.version] - Optional: Version number.
 * @param {object} [transactionShellData.metadata] - Optional: JSON metadata.
 * @param {object} actualEntryData - Data for the actual entry.
 * @param {object} expectedEntryData - Data for the expected entry.
 * @param {object} [callingTx] - Optional: Prisma transaction client if called within an existing transaction.
 * @returns {Promise<Transaction>} The newly created transaction object, with its entries.
 * @throws {Error} If required fields are missing or invalid.
 * @throws {BalanceError} If entries do not balance.
 */
const createTransactionInternal = async (
  transactionShellData,
  actualEntryData,
  expectedEntryData,
  callingTx
) => {
  const {
    merchant_id,
    status,
    logical_transaction_id,
    version,
    metadata,
  } = transactionShellData;

  // Validate transaction shell data
  if (!merchant_id || !status) {
    throw new Error('Missing required fields for transaction shell: merchant_id, status.');
  }
  // Ensure prisma.TransactionStatus is accessible. If it's from @prisma/client, it should be imported.
  // For now, assuming it's available globally or via prisma instance.
  // This might need adjustment if `prisma.TransactionStatus` is not directly on the prisma instance.
  // A safer way is `const { TransactionStatus } = require('@prisma/client');` at the top.
  const { TransactionStatus } = require('@prisma/client');
  if (!TransactionStatus[status]) {
    throw new Error(`Invalid transaction status: ${status}`);
  }

  // Validate entry data presence
  if (!actualEntryData || !expectedEntryData) {
    throw new Error('Actual and expected entry data must be provided.');
  }

  const prismaClient = callingTx || prisma;

  const merchant = await prismaClient.merchantAccount.findUnique({ where: { merchant_id } });
  if (!merchant) {
    throw new Error(`Merchant with ID ${merchant_id} not found.`);
  }

  // Implement Balancing Check
  const { EntryType } = require('@prisma/client'); // Ensure EntryType is available

  if (actualEntryData.amount !== expectedEntryData.amount) {
    throw new BalanceError(`Amounts do not balance: actual ${actualEntryData.amount}, expected ${expectedEntryData.amount}`);
  }
  if (actualEntryData.currency !== expectedEntryData.currency) {
    throw new BalanceError(`Currencies do not match: actual ${actualEntryData.currency}, expected ${expectedEntryData.currency}`);
  }
  if (!((actualEntryData.entry_type === EntryType.DEBIT && expectedEntryData.entry_type === EntryType.CREDIT) ||
        (actualEntryData.entry_type === EntryType.CREDIT && expectedEntryData.entry_type === EntryType.DEBIT))) {
    throw new BalanceError('Entry types must be one DEBIT and one CREDIT.');
  }
  
  // Atomic operations using Prisma interactive transactions
  try {
    const result = await (callingTx || prisma).$transaction(async (tx) => {
      // Create the transaction shell
      const newTransaction = await tx.transaction.create({
        data: {
          merchant_id,
          status,
          logical_transaction_id, // This will be undefined if not provided, which is fine
          version,                // This will be undefined if not provided, defaulting in schema
          metadata,
        },
      });

      // Prepare entry data with the new transaction_id
      const finalActualEntryData = {
        ...actualEntryData,
        transaction_id: newTransaction.transaction_id,
      };
      const finalExpectedEntryData = {
        ...expectedEntryData,
        transaction_id: newTransaction.transaction_id,
      };

      // Create entries using the refactored entryCore.createEntryInternal, passing the transaction client tx
      const createdActualEntry = await entryCore.createEntryInternal(finalActualEntryData, tx);
      const createdExpectedEntry = await entryCore.createEntryInternal(finalExpectedEntryData, tx);

      return { ...newTransaction, entries: [createdActualEntry, createdExpectedEntry] };
    });
    return result;
  } catch (error) {
    // Log the specific error for better debugging
    console.error(`Error during atomic transaction creation for merchant ${merchant_id}:`, error);
    // Re-throw a generic error or the original error if it's a BalanceError or similar custom error
    if (error instanceof BalanceError) {
      throw error;
    }
    // Add more specific error handling if needed, e.g., for Prisma-specific transaction errors
    throw new Error('Could not create internal transaction with entries due to an internal error.');
  }
};

module.exports = {
  listTransactions,
  createTransactionInternal,
  BalanceError, // Export BalanceError
};
