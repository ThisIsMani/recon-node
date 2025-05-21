// src/server/routes/account/index.js
const express = require('express');
const accountCore = require('../../core/account');

const router = express.Router({ mergeParams: true }); // mergeParams allows access to :merchant_id

/**
 * @swagger
 * tags:
 *   name: Accounts
 *   description: Account management for a specific merchant
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AccountInput:
 *       type: object
 *       required:
 *         - account_name
 *         - account_type
 *         - currency
 *       properties:
 *         account_name:
 *           type: string
 *           description: Name of the account.
 *           example: "Main Operating Account"
 *         account_type:
 *           $ref: '#/components/schemas/AccountTypeEnum'
 *         currency:
 *           type: string
 *           description: 3-letter currency code (ISO 4217).
 *           example: "USD"
 *     AccountNameUpdateInput:
 *       type: object
 *       required:
 *         - account_name
 *       properties:
 *         account_name:
 *           type: string
 *           description: The new name for the account.
 *           example: "Updated Operating Account"
 *     AccountResponse:
 *       type: object
 *       properties:
 *         account_id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the account.
 *           example: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *         merchant_id:
 *           type: string
 *           description: Identifier of the merchant this account belongs to.
 *           example: "merchant_123"
 *         account_name:
 *           type: string
 *           description: Name of the account.
 *           example: "Main Operating Account"
 *         account_type:
 *           $ref: '#/components/schemas/AccountTypeEnum'
 *         currency:
 *           type: string
 *           description: 3-letter currency code.
 *           example: "USD"
 *     AccountWithBalanceResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/AccountResponse'
 *         - type: object
 *           properties:
 *             posted_balance:
 *               type: string
 *               description: Placeholder for posted balance.
 *               example: "0.00"
 *             pending_balance:
 *               type: string
 *               description: Placeholder for pending balance.
 *               example: "0.00"
 *             available_balance:
 *               type: string
 *               description: Placeholder for available balance.
 *               example: "0.00"
 *     AccountTypeEnum:
 *       type: string
 *       enum: [DEBIT_NORMAL, CREDIT_NORMAL]
 *       description: Type of the account. DEBIT_NORMAL for assets/expenses, CREDIT_NORMAL for liabilities/revenue/equity.
 *       example: "DEBIT_NORMAL"
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
 *         description: The ID of the merchant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AccountInput'
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountResponse'
 *       400:
 *         description: Invalid input (e.g., missing fields, merchant not found)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  const { merchant_id } = req.params;
  try {
    // TODO: Add input validation for req.body (e.g., using Joi or Zod)
    if (!req.body.account_name || !req.body.account_type || !req.body.currency) {
      return res.status(400).json({ error: 'Missing required fields: account_name, account_type, currency' });
    }
    const account = await accountCore.createAccount(merchant_id, req.body);
    res.status(201).json(account);
  } catch (error) {
    if (error.message.includes('Merchant with ID') || error.message.startsWith('Invalid input for account creation. Details:')) { // Added ". Details"
        return res.status(400).json({ error: error.message });
    }
    // Log the full error for server-side inspection if it's not a 400
    console.error(`Unexpected error in POST /accounts: ${error.message}`, error.stack);
    res.status(500).json({ error: 'An unexpected error occurred while creating the account.' });
  }
});

/**
 * @swagger
 * /merchants/{merchant_id}/accounts:
 *   get:
 *     summary: List all accounts for a merchant
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: merchant_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the merchant
 *     responses:
 *       200:
 *         description: A list of accounts with placeholder balances
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AccountWithBalanceResponse'
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  const { merchant_id } = req.params;
  try {
    const accounts = await accountCore.listAccountsByMerchant(merchant_id);
    res.status(200).json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /merchants/{merchant_id}/accounts/{account_id}:
 *   delete:
 *     summary: Delete an account for a merchant
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: merchant_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the merchant
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the account to delete
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountResponse'
 *       404:
 *         description: Account not found or does not belong to the merchant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 */
router.delete('/:account_id', async (req, res) => {
  const { merchant_id, account_id } = req.params;
  try {
    const deletedAccount = await accountCore.deleteAccount(merchant_id, account_id);
    // Core logic now throws specific errors for not found or wrong merchant
    res.status(200).json(deletedAccount);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('does not belong')) {
        return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

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
 *         description: The ID of the merchant
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the account to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AccountNameUpdateInput'
 *     responses:
 *       200:
 *         description: Account name updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountResponse'
 *       400:
 *         description: Invalid input (e.g., missing account_name)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       404:
 *         description: Account not found or does not belong to the merchant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 */
router.put('/:account_id', async (req, res) => {
  const { merchant_id, account_id } = req.params;
  const { account_name: newAccountName } = req.body;

  try {
    if (!newAccountName || typeof newAccountName !== 'string' || newAccountName.trim() === '') {
      return res.status(400).json({ error: 'Missing or invalid required field: account_name (must be a non-empty string)' });
    }
    const updatedAccount = await accountCore.updateAccountName(merchant_id, account_id, newAccountName.trim());
    res.status(200).json(updatedAccount);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('does not belong')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.startsWith('Could not update account name. Internal error:')) {
        console.error(`Unexpected error in PATCH /accounts/${account_id}: ${error.message}`, error.stack);
        return res.status(500).json({ error: 'An unexpected error occurred while updating the account name.' });
    }
    // For other errors from core (like validation if added later) or unexpected ones
    console.error(`Error in PATCH /accounts/${account_id}: ${error.message}`, error.stack);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
