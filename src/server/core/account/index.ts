import prisma from '../../../services/prisma';
import logger from '../../../services/logger';
import { Account as PrismaAccountFromPrisma, AccountType as PrismaAccountType, Prisma } from '@prisma/client'; // Renamed to avoid clash
import { Account } from '../../domain_models/account.types'; // Import Domain Model
import { AppError, NotFoundError, ValidationError, InternalServerError } from '../../../errors/AppError';
import { findUniqueOrThrow, ensureEntityBelongsToMerchant } from '../../../services/databaseHelpers';

// Define input data structure for creating an account, aligning with CreateAccountRequest
export interface CreateAccountInput { // Export if used by routes directly, or keep local if routes map to it
    merchant_id: string;
    account_name: string;
    account_type: PrismaAccountType;
    currency: string;
}

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
 * @param {CreateAccountInput} accountInput - Data for the new account, including merchant_id.
 * @returns {Promise<Account>} The created account object (Domain Model).
 */
async function createAccount(accountInput: CreateAccountInput): Promise<Account> {
  // TODO: Add validation for accountInput
  try {
    // Ensure merchant exists
    await findUniqueOrThrow<import('@prisma/client').MerchantAccount>(
      Prisma.ModelName.MerchantAccount, 
      { where: { merchant_id: accountInput.merchant_id } },
      'Merchant',
      accountInput.merchant_id
    );

    const newPrismaAccount = await prisma.account.create({
      data: {
        merchant_id: accountInput.merchant_id,
        account_name: accountInput.account_name,
        account_type: accountInput.account_type,
        currency: accountInput.currency,
      },
      // Select all fields to match the full Account domain model (which includes timestamps)
      // Alternatively, if Account domain model was Omit<PrismaAccount, 'some_other_field'>, adjust select accordingly.
      // Since Account extends PrismaAccount (full), we expect all fields.
    });
    return newPrismaAccount as Account; // Cast to Domain model
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const prismaError = error as PrismaError;
    if (process.env.NODE_ENV !== 'test') {
      logger.error(prismaError, { context: 'Error creating account' });
    }
    if (prismaError.name === 'PrismaClientValidationError' || (prismaError.code && prismaError.code.startsWith('P2'))) {
        throw new ValidationError(`Invalid input for account creation. Details: ${prismaError.message.split('\n').slice(-2).join(' ')}`);
    }
    throw new InternalServerError('Could not create account due to an internal error: ' + prismaError.message);
  }
}

/**
 * Lists all accounts for a specific merchant, with placeholder balances.
 * @param {string} merchantId - The ID of the merchant.
 * @returns {Promise<Array<Account & { posted_balance: string, pending_balance: string, available_balance: string }>>} A list of accounts (Domain Models with balance).
 */
async function listAccountsByMerchant(merchantId: string): Promise<Array<Account & { posted_balance: string, pending_balance: string, available_balance: string }>> {
  try {
    const prismaAccounts = await prisma.account.findMany({
      where: {
        merchant_id: merchantId,
      },
      // Select all fields to match the full Account domain model
    });
    return prismaAccounts.map(acc => ({ 
        ...(acc as Account), // Cast to Domain model
        posted_balance: '0.00', 
        pending_balance: '0.00', 
        available_balance: '0.00' 
    }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (process.env.NODE_ENV !== 'test') {
      logger.error(error as Error, { context: 'Error listing accounts' });
    }
    throw new InternalServerError('Could not list accounts due to an internal error.');
  }
}

/**
 * Deletes a specific account for a merchant.
 * @param {string} merchantId - The ID of the merchant.
 * @param {string} accountId - The ID of the account to delete.
 * @returns {Promise<Account>} The deleted account object (Domain Model).
 */
async function deleteAccount(merchantId: string, accountId: string): Promise<Account> {
  try {
    const account = await findUniqueOrThrow<PrismaAccountFromPrisma>( // Use aliased PrismaAccount
      Prisma.ModelName.Account,
      { where: { account_id: accountId } },
      'Account',
      accountId
    );

    ensureEntityBelongsToMerchant(account, merchantId, 'Account', accountId);

    const deletedPrismaAccount = await prisma.account.delete({
      where: {
        account_id: accountId,
      },
      // Select all fields
    });
    return deletedPrismaAccount as Account; // Cast to Domain model
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const prismaError = error as PrismaError;
    if (process.env.NODE_ENV !== 'test') {
      logger.error(prismaError, { context: 'Error deleting account' });
    }
    if (prismaError.code === 'P2025') {
        throw new NotFoundError(`Account with ID ${accountId} not found for deletion (or already deleted).`);
    }
    throw new InternalServerError('Could not delete account due to an internal error: ' + prismaError.message);
  }
}

/**
 * Updates the name of a specific account for a merchant.
 * @param {string} merchantId - The ID of the merchant.
 * @param {string} accountId - The ID of the account to update.
 * @param {string} newAccountName - The new name for the account.
 * @returns {Promise<Account>} The updated account object (Domain Model).
 */
async function updateAccountName(merchantId: string, accountId: string, newAccountName: string): Promise<Account> {
  try {
    const account = await findUniqueOrThrow<PrismaAccountFromPrisma>( // Use aliased PrismaAccount
      Prisma.ModelName.Account,
      { where: { account_id: accountId } },
      'Account',
      accountId
    );

    ensureEntityBelongsToMerchant(account, merchantId, 'Account', accountId);

    const updatedPrismaAccount = await prisma.account.update({
      where: {
        account_id: accountId,
      },
      data: {
        account_name: newAccountName,
      },
      // Select all fields
    });
    return updatedPrismaAccount as Account; // Cast to Domain model
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const prismaError = error as PrismaError;
    if (process.env.NODE_ENV !== 'test') {
      logger.error(prismaError, { context: 'Error updating account name' });
    }
    if (prismaError.code === 'P2025') { // Record to update not found
        throw new NotFoundError(`Account with ID ${accountId} not found for update.`);
    }
    if (prismaError.name === 'PrismaClientValidationError' || (prismaError.code && prismaError.code.startsWith('P2'))) {
        throw new ValidationError(`Invalid input for account update. Details: ${prismaError.message.split('\n').slice(-2).join(' ')}`);
    }
    throw new InternalServerError('Could not update account name. Internal error: ' + prismaError.message);
  }
}

export {
  createAccount,
  listAccountsByMerchant,
  deleteAccount,
  updateAccountName,
};
