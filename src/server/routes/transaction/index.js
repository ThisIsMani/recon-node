const express = require('express');
const { listTransactions } = require('../../core/transaction');
const prisma = require('../../../services/prisma');

const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Financial transaction management (currently, only listing is supported).
 */

/**
 * @swagger
 * /merchants/{merchantId}/transactions:
 *   get:
 *     summary: List transactions for a specific merchant.
 *     tags: [Transactions]
 *     description: Retrieves a list of transactions associated with the given merchant ID. Transactions are not created directly via API.
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the merchant to retrieve transactions for.
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/TransactionStatusEnum'
 *         description: Optional. Filter transactions by status.
 *       - in: query
 *         name: logical_transaction_id
 *         schema:
 *           type: string
 *         description: Optional. Filter by logical transaction ID.
 *       - in: query
 *         name: version
 *         schema:
 *           type: integer
 *         description: Optional. Filter by transaction version.
 *     responses:
 *       200:
 *         description: A list of transactions.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 *       404:
 *         description: Merchant not found.
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
  const { merchant_id } = req.params; // merchant_id from path due to mergeParams
  const queryParams = req.query;

  try {
    const merchant = await prisma.merchantAccount.findUnique({ where: { merchant_id } });
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found.' });
    }

    const transactions = await listTransactions(merchant_id, queryParams);
    res.json(transactions);
  } catch (error) {
    console.error(`Failed to list transactions for merchant ${merchant_id}:`, error);
    res.status(500).json({ error: 'Failed to retrieve transactions.' });
  }
});

module.exports = router;
