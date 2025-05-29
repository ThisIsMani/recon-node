import express, { Router, RequestHandler } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { listTransactions } from '../../core/transaction'; // Core logic is now TS
import prisma from '../../../services/prisma';
import logger from '../../../services/logger';
import { TransactionStatus } from '@prisma/client'; // For query param typing
import { AppError } from '../../../errors/AppError'; // Import AppError
import { TransactionResponse, GroupedTransactionResponse, AccountInfo } from '../../api_models/transaction.types'; // Import new API model
import { EntryResponse } from '../../api_models/entry.types'; // Import entry API model

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
    
    // Group transactions by logical_transaction_id
    const groupedTransactions = new Map<string, any[]>();
    
    transactionDataList.forEach(tx => {
      const logicalId = tx.logical_transaction_id;
      if (!groupedTransactions.has(logicalId)) {
        groupedTransactions.set(logicalId, []);
      }
      groupedTransactions.get(logicalId)!.push(tx);
    });
    
    // Build grouped response
    const groupedResponses: GroupedTransactionResponse[] = [];
    
    for (const [logicalId, versions] of groupedTransactions) {
      // Sort versions by version number descending to get current version first
      versions.sort((a, b) => b.version - a.version);
      
      const currentVersion = versions[0];
      
      // Extract account information from current version's entries
      const fromAccounts: AccountInfo[] = [];
      const toAccounts: AccountInfo[] = [];
      
      if (currentVersion.entries) {
        currentVersion.entries.forEach((entry: any) => {
          const accountInfo: AccountInfo = {
            account_id: entry.account_id,
            account_name: entry.account?.account_name || 'Unknown Account',
            entry_type: entry.entry_type
          };
          
          if (entry.entry_type === 'CREDIT') {
            fromAccounts.push(accountInfo);
          } else if (entry.entry_type === 'DEBIT') {
            toAccounts.push(accountInfo);
          }
        });
      }
      
      // Map all versions to TransactionResponse format
      const versionResponses: TransactionResponse[] = versions.map(txData => ({
        transaction_id: txData.transaction_id,
        logical_transaction_id: txData.logical_transaction_id,
        version: txData.version,
        amount: txData.amount.toString(),
        currency: txData.currency,
        merchant_id: txData.merchant_id,
        status: txData.status,
        created_at: txData.created_at,
        updated_at: txData.updated_at,
        discarded_at: txData.discarded_at,
        metadata: txData.metadata,
        entries: txData.entries ? txData.entries.map((entry: any) => ({
          entry_id: entry.entry_id,
          account_id: entry.account_id,
          transaction_id: txData.transaction_id,
          entry_type: entry.entry_type,
          amount: entry.amount.toString(),
          currency: entry.currency,
          status: entry.status,
          effective_date: entry.effective_date,
          metadata: entry.metadata || null,
          discarded_at: entry.discarded_at || null,
          created_at: entry.created_at,
          updated_at: entry.updated_at
        } as EntryResponse)) : []
      }));
      
      groupedResponses.push({
        logical_transaction_id: logicalId,
        current_version: currentVersion.version,
        amount: currentVersion.amount.toString(),
        currency: currentVersion.currency,
        from_accounts: fromAccounts,
        to_accounts: toAccounts,
        status: currentVersion.status,
        versions: versionResponses
      });
    }
    
    // Sort grouped responses by newest first (based on current version's created_at)
    groupedResponses.sort((a, b) => {
      const aCreatedAt = new Date(a.versions[0].created_at).getTime();
      const bCreatedAt = new Date(b.versions[0].created_at).getTime();
      return bCreatedAt - aCreatedAt;
    });
    
    res.json(groupedResponses);
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
