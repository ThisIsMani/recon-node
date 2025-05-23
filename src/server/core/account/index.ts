import prisma from '../../../services/prisma';
import logger from '../../../services/logger';
import { Account as PrismaAccount, AccountType as PrismaAccountType } from '@prisma/client';

// Define input data structure for creating an account
interface AccountData {
    account_name: string;
    account_type: PrismaAccountType; // Use Prisma enum for account_type
    currency: string;
}

// Define the structure of the account object returned by core functions
// (excluding created_at and updated_at, as per original select)
type AccountCoreOutput = Omit<PrismaAccount, 'created_at' | 'updated_at'>;

// Define a type for Prisma errors that include a 'code' and 'meta'
// It intersects with the base Error type to include standard error properties.
type PrismaError = Error & {
    code?: string;
    meta?: {
        target?: string[];
        message?: string; // For P2025, though Prisma usually puts this in the main error message
    };
    // 'name' is already part of the base Error type
};


/**
 * Creates a new account for a specific merchant.
 * @param {string} merchantId - The ID of the merchant.
 * @param {AccountData} accountData - Data for the new account.
 * @returns {Promise<AccountCoreOutput>} The created account object.
 */
async function createAccount(merchantId: string, accountData: AccountData): Promise<AccountCoreOutput> {
  // TODO: Add validation for accountData
  try {
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
      select: {
        account_id: true,
        merchant_id: true,
        account_name: true,
        account_type: true,
        currency: true,
      }
    });
    return newAccount;
  } catch (error) {
    const prismaError = error as PrismaError;
    if (process.env.NODE_ENV !== 'test') {
      logger.error('Error creating account:', error);
    }
    if (prismaError.message?.startsWith('Merchant with ID')) {
        throw prismaError;
    }
    if (prismaError.name === 'PrismaClientValidationError' || (prismaError.code && prismaError.code.startsWith('P2'))) {
        throw new Error(`Invalid input for account creation. Details: ${prismaError.message.split('\n').slice(-2).join(' ')}`);
    }
    throw new Error('Could not create account. Internal error: ' + prismaError.message);
  }
}

/**
 * Lists all accounts for a specific merchant, with placeholder balances.
 * @param {string} merchantId - The ID of the merchant.
 * @returns {Promise<Array<AccountCoreOutput & { posted_balance: string, pending_balance: string, available_balance: string }>>} A list of accounts.
 */
async function listAccountsByMerchant(merchantId: string): Promise<Array<AccountCoreOutput & { posted_balance: string, pending_balance: string, available_balance: string }>> {
  try {
    const accounts = await prisma.account.findMany({
      where: {
        merchant_id: merchantId,
      },
      select: {
        account_id: true,
        merchant_id: true,
        account_name: true,
        account_type: true,
        currency: true,
      }
    });
    return accounts.map(acc => ({ 
        ...acc, 
        posted_balance: '0.00', 
        pending_balance: '0.00', 
        available_balance: '0.00' 
    }));
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      logger.error('Error listing accounts:', error);
    }
    throw new Error('Could not list accounts.');
  }
}

/**
 * Deletes a specific account for a merchant.
 * @param {string} merchantId - The ID of the merchant.
 * @param {string} accountId - The ID of the account to delete.
 * @returns {Promise<AccountCoreOutput>} The deleted account object.
 */
async function deleteAccount(merchantId: string, accountId: string): Promise<AccountCoreOutput> {
  try {
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
      select: {
        account_id: true,
        merchant_id: true,
        account_name: true,
        account_type: true,
        currency: true,
      }
    });
    return deletedAccount;
  } catch (error) {
    const prismaError = error as PrismaError;
    if (process.env.NODE_ENV !== 'test') {
      logger.error('Error deleting account:', error);
    }
    if (prismaError.message?.startsWith('Account with ID')) throw prismaError;
    if (prismaError.code === 'P2025') { // Prisma's error for record not found during delete
        throw new Error(`Account with ID ${accountId} not found for deletion.`);
    }
    throw new Error('Could not delete account.');
  }
}

/**
 * Updates the name of a specific account for a merchant.
 * @param {string} merchantId - The ID of the merchant.
 * @param {string} accountId - The ID of the account to update.
 * @param {string} newAccountName - The new name for the account.
 * @returns {Promise<AccountCoreOutput>} The updated account object.
 */
async function updateAccountName(merchantId: string, accountId: string, newAccountName: string): Promise<AccountCoreOutput> {
  try {
    const account = await prisma.account.findUnique({
      where: { account_id: accountId },
    });

    if (!account) {
      throw new Error(`Account with ID ${accountId} not found.`);
    }
    if (account.merchant_id !== merchantId) {
      throw new Error(`Account with ID ${accountId} does not belong to merchant ${merchantId}.`);
    }

    const updatedAccount = await prisma.account.update({
      where: {
        account_id: accountId,
      },
      data: {
        account_name: newAccountName,
      },
      select: {
        account_id: true,
        merchant_id: true,
        account_name: true,
        account_type: true,
        currency: true,
      }
    });
    return updatedAccount;
  } catch (error) {
    const prismaError = error as PrismaError;
    if (process.env.NODE_ENV !== 'test') {
      logger.error('Error updating account name:', error);
    }
    if (prismaError.message?.startsWith('Account with ID')) throw prismaError;
    if (prismaError.code === 'P2025') {
        throw new Error(`Account with ID ${accountId} not found for update.`);
    }
    throw new Error('Could not update account name. Internal error: ' + prismaError.message);
  }
}

export {
  createAccount,
  listAccountsByMerchant,
  deleteAccount,
  updateAccountName,
};
