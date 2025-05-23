import express, { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import * as accountCore from '../../core/account'; // Using * as import for CommonJS module
import logger from '../../../services/logger';
import { AccountType as PrismaAccountType } from '@prisma/client'; // For validating account_type

const router: Router = express.Router({ mergeParams: true }); // mergeParams allows access to :merchant_id

// Interface for request body when creating an account
interface CreateAccountBody {
    account_name: string;
    account_type: PrismaAccountType;
    currency: string;
}

// Interface for request body when updating an account name
interface UpdateAccountNameBody {
    account_name: string;
}

/**
 * @swagger
 * tags:
 *   name: Accounts
 *   description: Account management for a specific merchant
 */

// ... (Swagger definitions remain the same) ...

const createAccountHandler: RequestHandler<{ merchant_id: string }, any, CreateAccountBody> = async (req, res, next) => {
  const { merchant_id } = req.params;
  try {
    const { account_name, account_type, currency } = req.body;
    if (!account_name || !account_type || !currency) {
      res.status(400).json({ error: 'Missing required fields: account_name, account_type, currency' });
      return;
    }
    // Basic validation for account_type enum
    if (!Object.values(PrismaAccountType).includes(account_type)) {
        res.status(400).json({ error: `Invalid account_type. Must be one of: ${Object.values(PrismaAccountType).join(', ')}` });
        return;
    }
    const account = await accountCore.createAccount(merchant_id, { account_name, account_type, currency });
    res.status(201).json(account);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('Merchant with ID') || err.message.startsWith('Invalid input for account creation. Details:')) {
        res.status(400).json({ error: err.message });
        return;
    }
    logger.error(`Unexpected error in POST /merchants/${merchant_id}/accounts: ${err.message}`, err.stack);
    res.status(500).json({ error: 'An unexpected error occurred while creating the account.' });
  }
};
router.post('/', createAccountHandler);

const listAccountsHandler: RequestHandler<{ merchant_id: string }> = async (req, res, next) => {
  const { merchant_id } = req.params;
  try {
    const accounts = await accountCore.listAccountsByMerchant(merchant_id);
    res.status(200).json(accounts);
  } catch (error) {
    const err = error as Error;
    logger.error(`Error in GET /merchants/${merchant_id}/accounts: ${err.message}`, err.stack);
    res.status(500).json({ error: err.message });
  }
};
router.get('/', listAccountsHandler);

const deleteAccountHandler: RequestHandler<{ merchant_id: string, account_id: string }> = async (req, res, next) => {
  const { merchant_id, account_id } = req.params;
  try {
    const deletedAccount = await accountCore.deleteAccount(merchant_id, account_id);
    res.status(200).json(deletedAccount);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('not found') || err.message.includes('does not belong')) {
        res.status(404).json({ error: err.message });
        return;
    }
    logger.error(`Error in DELETE /merchants/${merchant_id}/accounts/${account_id}: ${err.message}`, err.stack);
    res.status(500).json({ error: err.message });
  }
};
router.delete('/:account_id', deleteAccountHandler);

const updateAccountNameHandler: RequestHandler<{ merchant_id: string, account_id: string }, any, UpdateAccountNameBody> = async (req, res, next) => {
  const { merchant_id, account_id } = req.params;
  const { account_name: newAccountName } = req.body;

  try {
    if (!newAccountName || typeof newAccountName !== 'string' || newAccountName.trim() === '') {
      res.status(400).json({ error: 'Missing or invalid required field: account_name (must be a non-empty string)' });
      return;
    }
    const updatedAccount = await accountCore.updateAccountName(merchant_id, account_id, newAccountName.trim());
    res.status(200).json(updatedAccount);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('not found') || err.message.includes('does not belong')) {
      res.status(404).json({ error: err.message });
      return;
    }
    // Distinguish between user-facing "could not update" and actual internal server errors.
    if (err.message.startsWith('Could not update account name. Internal error:')) {
        logger.error(`Internal error in PUT /merchants/${merchant_id}/accounts/${account_id}: ${err.message}`, err.stack);
        res.status(500).json({ error: 'An unexpected internal error occurred while updating the account name.' });
        return;
    }
    // For other errors from core logic that might be validation-like or specific (e.g. "Invalid input")
    logger.error(`Error in PUT /merchants/${merchant_id}/accounts/${account_id}: ${err.message}`, err.stack);
    res.status(500).json({ error: err.message }); // Or a more generic message if preferred
  }
};
router.put('/:account_id', updateAccountNameHandler);

export default router;
