const prisma = require('../../../services/prisma');

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

module.exports = {
  listEntries,
};
