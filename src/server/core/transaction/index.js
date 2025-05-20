const prisma = require('../../../services/prisma');
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
 * @param {Array<object>} entriesData - An array of entry data objects to be created and linked.
 * Each entry object should conform to the input of `entryCore.createEntryInternal`.
 * @returns {Promise<Transaction>} The newly created transaction object, with its entries.
 */
const createTransactionInternal = async (transactionShellData, entriesData = []) => {
  const {
    merchant_id,
    status,
    logical_transaction_id,
    version,
    metadata,
  } = transactionShellData;

  if (!merchant_id || !status) {
    throw new Error('Missing required fields for transaction shell: merchant_id, status.');
  }
  if (!prisma.TransactionStatus[status]) {
    throw new Error(`Invalid transaction status: ${status}`);
  }
  const merchant = await prisma.merchantAccount.findUnique({ where: { merchant_id } });
  if (!merchant) {
    throw new Error(`Merchant with ID ${merchant_id} not found.`);
  }

  // TODO: Implement balancing check: sum of debits should equal sum of credits for certain statuses.
  // For now, this check is deferred.

  try {
    // Create the transaction shell
    const newTransaction = await prisma.transaction.create({
      data: {
        merchant_id,
        status,
        logical_transaction_id,
        version,
        metadata,
      },
    });

    // Create and link entries
    const createdEntries = [];
    if (entriesData && entriesData.length > 0) {
      for (const entryItem of entriesData) {
        const entryToCreate = {
          ...entryItem,
          transaction_id: newTransaction.transaction_id, // Link to the new transaction
        };
        // Assuming entryCore.createEntryInternal handles its own validation (account_id, etc.)
        const createdEntry = await entryCore.createEntryInternal(entryToCreate);
        createdEntries.push(createdEntry);
      }
    }
    
    // Return the transaction with its entries (Prisma doesn't automatically include them on create)
    // So, we'll just attach what we created. A full fetch could also be done.
    return { ...newTransaction, entries: createdEntries };

  } catch (error) {
    console.error(`Error creating internal transaction with entries for merchant ${merchant_id}:`, error);
    // Consider if a transaction shell was created but entries failed, how to handle rollback.
    // For now, a general error is thrown. More sophisticated transaction management might be needed.
    throw new Error('Could not create internal transaction with entries.');
  }
};

module.exports = {
  listTransactions,
  createTransactionInternal,
};
