const express = require('express');
const { listEntries } = require('../../core/entry');
const prisma = require('../../../services/prisma'); // Added prisma for account check

// mergeParams: true is essential for accessing :account_id from the parent router
const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * tags:
 *   name: Entries
 *   description: Ledger entry management (currently, only listing is supported).
 */

/**
 * @swagger
 * /accounts/{accountId}/entries:
 *   get:
 *     summary: List entries for a specific account.
 *     tags: [Entries]
 *     description: Retrieves a list of ledger entries associated with the given account ID. Entries are not created directly via API.
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the account to retrieve entries for.
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/EntryStatusEnum'
 *         description: Optional. Filter entries by status.
 *     responses:
 *       200:
 *         description: A list of entries.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf: # Combine Entry schema with the new transaction details
 *                   - $ref: '#/components/schemas/Entry'
 *                   - type: object
 *                     properties:
 *                       transaction:
 *                         type: object
 *                         properties:
 *                           transaction_id:
 *                             type: string
 *                             description: The ID of the transaction this entry belongs to.
 *                           status:
 *                             $ref: '#/components/schemas/TransactionStatusEnum' # Assuming you have this defined
 *                           logical_transaction_id:
 *                             type: string
 *                             nullable: true
 *                           version:
 *                              type: integer
 *                         description: Details of the transaction associated with the entry.
 *       404:
 *         description: Account not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', async (req, res) => {
  const { account_id } = req.params; // account_id from path due to mergeParams
  const queryParams = req.query;

  try {
    // First, check if the account exists to provide a 404 if not
    const account = await prisma.account.findUnique({ where: { account_id } });
    if (!account) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    const entries = await listEntries(account_id, queryParams);
    res.json(entries);
  } catch (error) {
    console.error(`Failed to list entries for account ${account_id}:`, error);
    // Avoid sending detailed error messages to the client in production
    res.status(500).json({ error: 'Failed to retrieve entries.' });
  }
});

module.exports = router;
