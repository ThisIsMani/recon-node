import express, { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import * as accountCore from '../../core/account'; // Using * as import for CommonJS module
import logger from '../../../services/logger';
import { AccountType as PrismaAccountType } from '@prisma/client'; // For validating account_type
import { AppError } from '../../../errors/AppError'; // Import AppError
import { CreateAccountRequest, UpdateAccountRequest, AccountResponse } from '../../api_models/account.types'; // Import new API models

const router: Router = express.Router({ mergeParams: true }); // mergeParams allows access to :merchant_id

/**
 * @swagger
 * tags:
 *   name: Accounts
 *   description: Account management for a specific merchant
 */

/**
 * @swagger
 * /merchants/{merchant_id}/accounts:
 *   post:
 *     summary: Create a new account for a merchant
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: merchant_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the merchant to create an account for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - account_name
 *               - account_type
 *               - currency
 *             properties:
 *               account_name:
 *                 type: string
 *                 description: Name of the account
 *                 example: Main Operating Account
 *               account_type:
 *                 $ref: '#/components/schemas/AccountTypeEnum'
 *               currency:
 *                 type: string
 *                 description: 3-letter currency code
 *                 example: USD
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountResponse'
 *       400:
 *         description: Bad request (missing or invalid fields)
 *       404:
 *         description: Merchant not found
 *       500:
 *         description: Internal server error
 *
 *   get:
 *     summary: List all accounts for a merchant
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: merchant_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the merchant to list accounts for
 *     responses:
 *       200:
 *         description: List of accounts for the merchant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountsListResponse'
 *       404:
 *         description: Merchant not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /merchants/{merchant_id}/accounts/{account_id}:
 *   put:
 *     summary: Update an account's name
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: merchant_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the merchant the account belongs to
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the account to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - account_name
 *             properties:
 *               account_name:
 *                 type: string
 *                 description: New name for the account
 *     responses:
 *       200:
 *         description: Account updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountResponse'
 *       400:
 *         description: Bad request (missing or invalid fields)
 *       404:
 *         description: Merchant or account not found
 *       500:
 *         description: Internal server error
 *
 *   delete:
 *     summary: Delete an account
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: merchant_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the merchant the account belongs to
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the account to delete
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountResponse'
 *       404:
 *         description: Merchant or account not found
 *       500:
 *         description: Internal server error
 */

const createAccountHandler: RequestHandler<{ merchant_id: string }, any, CreateAccountRequest> = async (req, res, next) => {
  const { merchant_id } = req.params; // merchant_id from path is already in CreateAccountRequest
  try {
    const { account_name, account_type, currency } = req.body; // Fields from CreateAccountRequest
    
    // Add merchant_id from path to the data for core function
    const accountDataForCore = { merchant_id, account_name, account_type, currency };

    if (!account_name || !account_type || !currency) {
      // Consider using AppError for consistency
      res.status(400).json({ error: 'Missing required fields: account_name, account_type, currency' });
      return;
    }
    if (!Object.values(PrismaAccountType).includes(account_type)) {
        res.status(400).json({ error: `Invalid account_type. Must be one of: ${Object.values(PrismaAccountType).join(', ')}` });
        return;
    }
    const accountData = await accountCore.createAccount(accountDataForCore); // Pass combined data
    
    // Map Prisma model to API model
    const responseAccount: AccountResponse = {
        account_id: accountData.account_id,
        merchant_id: accountData.merchant_id,
        account_name: accountData.account_name,
        account_type: accountData.account_type,
        currency: accountData.currency,
        created_at: accountData.created_at,
        updated_at: accountData.updated_at,
    };
    res.status(201).json(responseAccount);
  } catch (error) {
    // Error handling remains the same, but ensure next(error) is called for AppError as well
    // if global error handler is set up. For now, keeping existing explicit handling.
    const err = error as Error;
    logger.error(err, { context: `Error in POST /merchants/${merchant_id}/accounts` });
    if (err instanceof AppError) {
        res.status(err.statusCode).json({ 
            error: err.message, 
            code: err.errorCode, 
            details: err.details 
        });
    } else {
        res.status(500).json({ error: 'An unexpected error occurred while creating the account.' });
    }
  }
};
router.post('/', createAccountHandler as RequestHandler);


const listAccountsHandler: RequestHandler<{ merchant_id: string }> = async (req, res, next) => {
  const { merchant_id } = req.params;
  try {
    const accountsData = await accountCore.listAccountsByMerchant(merchant_id);
    // Map array of Prisma models to array of API models
    const responseAccounts: AccountResponse[] = accountsData.map(acc => ({
        account_id: acc.account_id,
        merchant_id: acc.merchant_id,
        account_name: acc.account_name,
        account_type: acc.account_type,
        currency: acc.currency,
        created_at: acc.created_at,
        updated_at: acc.updated_at,
    }));
    res.status(200).json(responseAccounts);
  } catch (error) {
    const err = error as Error;
    logger.error(err, { context: `Error in GET /merchants/${merchant_id}/accounts` });
    if (err instanceof AppError) {
        res.status(err.statusCode).json({ 
            error: err.message, 
            code: err.errorCode, 
            details: err.details 
        });
    } else {
        res.status(500).json({ error: 'An unexpected error occurred while listing accounts.' });
    }
  }
};
router.get('/', listAccountsHandler as RequestHandler);


const deleteAccountHandler: RequestHandler<{ merchant_id: string, account_id: string }> = async (req, res, next) => {
  const { merchant_id, account_id } = req.params;
  try {
    const deletedAccountData = await accountCore.deleteAccount(merchant_id, account_id);
    // Map Prisma model to API model
    const responseAccount: AccountResponse = {
        account_id: deletedAccountData.account_id,
        merchant_id: deletedAccountData.merchant_id,
        account_name: deletedAccountData.account_name,
        account_type: deletedAccountData.account_type,
        currency: deletedAccountData.currency,
        created_at: deletedAccountData.created_at,
        updated_at: deletedAccountData.updated_at,
    };
    res.status(200).json(responseAccount);
  } catch (error) {
    const err = error as Error;
    logger.error(err, { context: `Error in DELETE /merchants/${merchant_id}/accounts/${account_id}` });
     if (err instanceof AppError) {
        res.status(err.statusCode).json({ 
            error: err.message, 
            code: err.errorCode, 
            details: err.details 
        });
    } else {
        res.status(500).json({ error: 'An unexpected error occurred while deleting the account.' });
    }
  }
};
router.delete('/:account_id', deleteAccountHandler as RequestHandler);


const updateAccountNameHandler: RequestHandler<{ merchant_id: string, account_id: string }, any, UpdateAccountRequest> = async (req, res, next) => {
  const { merchant_id, account_id } = req.params;
  // account_name is optional in UpdateAccountRequest (Partial<CreateAccountRequest>)
  const { account_name: newAccountName } = req.body; 

  try {
    if (!newAccountName || typeof newAccountName !== 'string' || newAccountName.trim() === '') {
      res.status(400).json({ error: 'Missing or invalid required field: account_name (must be a non-empty string)' });
      return;
    }
    const updatedAccountData = await accountCore.updateAccountName(merchant_id, account_id, newAccountName.trim());
    // Map Prisma model to API model
    const responseAccount: AccountResponse = {
        account_id: updatedAccountData.account_id,
        merchant_id: updatedAccountData.merchant_id,
        account_name: updatedAccountData.account_name,
        account_type: updatedAccountData.account_type,
        currency: updatedAccountData.currency,
        created_at: updatedAccountData.created_at,
        updated_at: updatedAccountData.updated_at,
    };
    res.status(200).json(responseAccount);
  } catch (error) {
    const err = error as Error;
    logger.error(err, { context: `Error in PUT /merchants/${merchant_id}/accounts/${account_id}` });
    if (err instanceof AppError) {
        res.status(err.statusCode).json({ 
            error: err.message, 
            code: err.errorCode, 
            details: err.details 
        });
    } else {
        res.status(500).json({ error: 'An unexpected error occurred while updating the account name.' });
    }
  }
};
router.put('/:account_id', updateAccountNameHandler as RequestHandler);

export default router;
