import express, { Router, RequestHandler } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { listEntries } from '../../core/entry'; // Core logic is now TS
import prisma from '../../../services/prisma';
import logger from '../../../services/logger';
import { EntryStatus } from '@prisma/client'; // For query param typing

const router: Router = express.Router({ mergeParams: true });

interface EntryRouteParams extends ParamsDictionary {
    account_id: string; // Changed from accountId to match req.params
}

interface EntryQuery {
    status?: EntryStatus;
}

/**
 * @swagger
 * tags:
 *   name: Entries
 *   description: Ledger entry management (currently, only listing is supported).
 */
// ... (Swagger definitions remain the same) ...

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

    const entries = await listEntries(account_id, queryParams);
    res.json(entries);
    // No explicit return here, as res.json() sends response and handler ends.
  } catch (error) {
    const err = error as Error;
    logger.error(`Failed to list entries for account ${account_id}:`, err);
    res.status(500).json({ error: 'Failed to retrieve entries.' });
    // No explicit return here for error path either.
  }
};

router.get('/', listEntriesHandler);

export default router;
