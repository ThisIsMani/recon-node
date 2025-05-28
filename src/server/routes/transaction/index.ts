import express, { Router, RequestHandler } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { listTransactions } from '../../core/transaction'; // Core logic is now TS
import prisma from '../../../services/prisma';
import logger from '../../../services/logger';
import { TransactionStatus } from '@prisma/client'; // For query param typing
import { AppError } from '../../../errors/AppError'; // Import AppError
import { TransactionResponse } from '../../api_models/transaction.types'; // Import new API model

const router: Router = express.Router({ mergeParams: true });

interface TransactionRouteParams extends ParamsDictionary {
    merchant_id: string;
}

interface TransactionQuery {
    status?: TransactionStatus;
    logical_transaction_id?: string;
    version?: string; // Keep as string, core logic will parse
}

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Financial transaction management (currently, only listing is supported).
 */

/**
 * @swagger
 * /merchants/{merchant_id}/transactions:
 *   get:
 *     summary: List all transactions for a merchant
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: merchant_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the merchant to list transactions for
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           $ref: '#/components/schemas/TransactionStatusEnum'
 *         description: Filter transactions by status
 *       - in: query
 *         name: logical_transaction_id
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter transactions by logical transaction ID
 *       - in: query
 *         name: version
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter transactions by version
 *     responses:
 *       200:
 *         description: List of transactions for the merchant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionsListResponse'
 *       404:
 *         description: Merchant not found
 *       500:
 *         description: Internal server error
 */

const listTransactionsHandler: RequestHandler<TransactionRouteParams, any, any, TransactionQuery> = async (req, res) => {
  const { merchant_id } = req.params; 
  const queryParams = req.query;

  try {
    const merchant = await prisma.merchantAccount.findUnique({ where: { merchant_id } });
    if (!merchant) {
      res.status(404).json({ error: 'Merchant not found.' });
      return; 
    }

    const transactionDataList = await listTransactions(merchant_id, queryParams);
    // Map Prisma models to API models
    const responseTransactions: TransactionResponse[] = transactionDataList.map(txData => ({
        transaction_id: txData.transaction_id,
        logical_transaction_id: txData.logical_transaction_id,
        version: txData.version,
        merchant_id: txData.merchant_id,
        status: txData.status,
        created_at: txData.created_at,
        updated_at: txData.updated_at,
        discarded_at: txData.discarded_at,
        metadata: txData.metadata,
        // If entries were part of txData and needed in response, map them here too
    }));
    res.json(responseTransactions);
  } catch (error) {
    const err = error as Error;
    logger.error(err, { context: `Failed to list transactions for merchant ${merchant_id}` });
    if (err instanceof AppError) {
        res.status(err.statusCode).json({ 
            error: err.message, 
            code: err.errorCode, 
            details: err.details 
        });
    } else {
        res.status(500).json({ error: 'An unexpected error occurred while listing transactions.' });
    }
  }
};

router.get('/', listTransactionsHandler);

export default router;
