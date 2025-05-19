// src/server/core/account/index.js
const prisma = require('../../../services/prisma');

/**
 * Creates a new account for a specific merchant.
 * @param {string} merchantId - The ID of the merchant.
 * @param {object} accountData - Data for the new account.
 * @param {string} accountData.account_name - Name of the account.
 * @param {string} accountData.account_type - Type of the account (DEBIT_NORMAL, CREDIT_NORMAL).
 * @param {string} accountData.currency - Currency code (e.g., USD).
 * @returns {Promise<object>} The created account object, excluding created_at and updated_at.
 */
async function createAccount(merchantId, accountData) {
  // TODO: Add validation for accountData
  try {
    // First, check if the merchant exists to provide a clearer error message
    const merchant = await prisma.merchantAccount.findUnique({
      where: { merchant_id: merchantId },
    });
    if (!merchant) {
      throw new Error(`Merchant with ID ${merchantId} not found.`);
    }

    const newAccount = await prisma.account.create({
      data: {
        merchant_id: merchantId,
        account_name: accountData.account_name,
        account_type: accountData.account_type,
        currency: accountData.currency,
      },
      select: { // Explicitly select fields to exclude created_at and updated_at from the return
        account_id: true,
        merchant_id: true,
        account_name: true,
        account_type: true,
        currency: true,
      }
    });
    return newAccount;
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error creating account:', error);
    }
    if (error.message.startsWith('Merchant with ID')) { // If our custom merchant not found error
        throw error;
    }
    // Check for Prisma validation errors (e.g., invalid enum, type issues)
    if (error.name === 'PrismaClientValidationError' || (error.code && error.code.startsWith('P2'))) { // P2xxx are Prisma query engine errors, often data validation
        throw new Error(`Invalid input for account creation. Details: ${error.message.split('\n').slice(-2).join(' ')}`); // Try to get a concise part of Prisma's error
    }
    // Handle other Prisma errors or generic errors
    throw new Error('Could not create account. Internal error: ' + error.message);
  }
}

/**
 * Lists all accounts for a specific merchant.
 * @param {string} merchantId - The ID of the merchant.
 * @returns {Promise<Array<object>>} A list of accounts, excluding created_at and updated_at, with placeholder balances.
 */
async function listAccountsByMerchant(merchantId) {
  try {
    const accounts = await prisma.account.findMany({
      where: {
        merchant_id: merchantId,
      },
      select: { // Explicitly select fields
        account_id: true,
        merchant_id: true,
        account_name: true,
        account_type: true,
        currency: true,
      }
    });
    // For now, balances are not stored. They would be calculated here or by the caller.
    // Add placeholder balances to each account object
    return accounts.map(acc => ({ 
        ...acc, 
        posted_balance: '0.00', 
        pending_balance: '0.00', 
        available_balance: '0.00' 
    }));
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error listing accounts:', error);
    }
    throw new Error('Could not list accounts.');
  }
}

/**
 * Deletes a specific account for a merchant.
 * @param {string} merchantId - The ID of the merchant.
 * @param {string} accountId - The ID of the account to delete.
 * @returns {Promise<object>} The deleted account object, excluding created_at and updated_at.
 */
async function deleteAccount(merchantId, accountId) {
  // TODO: Implement balance check (only delete if balances are zero) as a future enhancement.
  try {
    // First, verify the account belongs to the merchant.
    const account = await prisma.account.findUnique({
      where: { account_id: accountId },
    });

    if (!account) {
      throw new Error(`Account with ID ${accountId} not found.`);
    }
    if (account.merchant_id !== merchantId) {
      throw new Error(`Account with ID ${accountId} does not belong to merchant ${merchantId}.`);
    }

    const deletedAccount = await prisma.account.delete({
      where: {
        account_id: accountId,
      },
      select: { // Explicitly select fields
        account_id: true,
        merchant_id: true,
        account_name: true,
        account_type: true,
        currency: true,
      }
    });
    return deletedAccount;
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error deleting account:', error);
    }
    if (error.message.startsWith('Account with ID')) throw error; // Re-throw custom errors
    // Handle Prisma's specific error for record not found during delete
    if (error.code === 'P2025') {
        throw new Error(`Account with ID ${accountId} not found for deletion.`);
    }
    throw new Error('Could not delete account.');
  }
}

module.exports = {
  createAccount,
  listAccountsByMerchant,
  deleteAccount,
};
