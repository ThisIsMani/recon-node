const prisma = require('../../../services/prisma');

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

module.exports = {
  listTransactions,
};
