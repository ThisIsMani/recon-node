import express, { Router, RequestHandler } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { listEntries } from '../../core/entry'; // Core logic is now TS
import prisma from '../../../services/prisma';
import logger from '../../../services/logger';
import { EntryStatus as PrismaEntryStatus } from '@prisma/client'; // For query param typing, aliased
import { AppError } from '../../../errors/AppError'; // Import AppError
import { EntryResponse } from '../../api_models/entry.types'; // Import new API model

const router: Router = express.Router({ mergeParams: true });

interface EntryRouteParams extends ParamsDictionary {
    account_id: string; // Changed from accountId to match req.params
}

interface EntryQuery {
    status?: PrismaEntryStatus; // Use aliased Prisma type
}

/**
 * @swagger
 * tags:
 *   name: Entries
 *   description: Ledger entry management (currently, only listing is supported).
 */

/**
 * @swagger
 * /accounts/{account_id}/entries:
 *   get:
 *     summary: List all entries for an account
 *     tags: [Entries]
 *     parameters:
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the account to list entries for
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           $ref: '#/components/schemas/EntryStatusEnum'
 *         description: Filter entries by status
 *     responses:
 *       200:
 *         description: List of entries for the account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EntriesListResponse'
 *       404:
 *         description: Account not found
 *       500:
 *         description: Internal server error
 */

const listEntriesHandler: RequestHandler<EntryRouteParams, any, any, EntryQuery> = async (req, res) => {
  const { account_id } = req.params; 
  const queryParams = req.query;

  try {
    // Account existence check can be part of the core logic or remain here
    const account = await prisma.account.findUnique({ where: { account_id } });
    if (!account) {
      res.status(404).json({ error: 'Account not found.' });
      return; // Explicitly return to satisfy void return type for this path
    }

    const entryDataList = await listEntries(account_id, queryParams);
    // Map Prisma models to API models
    const responseEntries: EntryResponse[] = entryDataList.map(entryData => ({
        entry_id: entryData.entry_id,
        account: entryData.account ? {
          account_id: entryData.account.account_id,
          merchant_id: entryData.account.merchant_id,
          account_name: entryData.account.account_name,
          account_type: entryData.account.account_type
        } : null,
        transaction_id: entryData.transaction_id,
        entry_type: entryData.entry_type,
        amount: entryData.amount, // Assuming core logic returns Decimal or number compatible with EntryResponse
        currency: entryData.currency,
        status: entryData.status,
        effective_date: entryData.effective_date,
        metadata: entryData.metadata,
        transaction: entryData.transaction ? {
          transaction_id: entryData.transaction.transaction_id,
          logical_transaction_id: entryData.transaction.logical_transaction_id,
          status: entryData.transaction.status,
          version: entryData.transaction.version
        } : null,
        discarded_at: entryData.discarded_at,
        created_at: entryData.created_at,
        updated_at: entryData.updated_at,
    }));
    res.json(responseEntries);
    // No explicit return here, as res.json() sends response and handler ends.
  } catch (error) {
    const err = error as Error;
    logger.error(err, { context: `Failed to list entries for account ${account_id}` });
    if (err instanceof AppError) {
        res.status(err.statusCode).json({ 
            error: err.message, 
            code: err.errorCode, 
            details: err.details 
        });
    } else {
        res.status(500).json({ error: 'An unexpected error occurred while listing entries.' });
    }
    // No explicit return here for error path either.
  }
};

router.get('/', listEntriesHandler);

export default router;
