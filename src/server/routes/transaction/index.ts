import express, { Router, RequestHandler } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { listTransactions } from '../../core/transaction'; // Core logic is now TS
import prisma from '../../../services/prisma';
import logger from '../../../services/logger';
import { TransactionStatus } from '@prisma/client'; // For query param typing

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
// ... (Swagger definitions remain the same) ...

const listTransactionsHandler: RequestHandler<TransactionRouteParams, any, any, TransactionQuery> = async (req, res) => {
  const { merchant_id } = req.params; 
  const queryParams = req.query;

  try {
    const merchant = await prisma.merchantAccount.findUnique({ where: { merchant_id } });
    if (!merchant) {
      res.status(404).json({ error: 'Merchant not found.' });
      return; 
    }

    const transactions = await listTransactions(merchant_id, queryParams);
    res.json(transactions);
  } catch (error) {
    const err = error as Error;
    logger.error(`Failed to list transactions for merchant ${merchant_id}:`, err);
    res.status(500).json({ error: 'Failed to retrieve transactions.' });
  }
};

router.get('/', listTransactionsHandler);

export default router;
