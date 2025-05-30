// API Models for Transaction Entity (Request/Response DTOs)
import { TransactionStatus } from '@prisma/client'; // Assuming TransactionStatus enum is used
import { EntryResponse } from './entry.types';

/**
 * @openapi
 * components:
 *   schemas:
 *     TransactionResponse:
 *       type: object
 *       properties:
 *         transaction_id:
 *           type: string
 *           format: cuid
 *           description: The unique identifier for the transaction.
 *         logical_transaction_id:
 *           type: string
 *           format: cuid
 *           description: The logical identifier for the transaction, grouping versions.
 *         version:
 *           type: integer
 *           description: The version number of this transaction instance.
 *         amount:
 *           type: number
 *           format: decimal
 *           description: The transaction amount (absolute value).
 *         currency:
 *           type: string
 *           description: The currency code (e.g., USD, EUR).
 *         merchant_id:
 *           type: string
 *           description: The ID of the merchant this transaction belongs to.
 *         status:
 *           $ref: '#/components/schemas/TransactionStatusEnum'
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp of creation.
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp of last update.
 *         discarded_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Timestamp if the transaction was discarded.
 *         metadata:
 *           type: object
 *           nullable: true
 *           description: Additional metadata for the transaction.
 *         entries:
 *           type: array
 *           nullable: true
 *           description: Array of entries associated with this transaction.
 *           items:
 *             $ref: '#/components/schemas/EntryResponse'
 *     GroupedTransactionResponse:
 *       type: object
 *       properties:
 *         logical_transaction_id:
 *           type: string
 *           format: cuid
 *           description: The logical identifier grouping all versions.
 *         current_version:
 *           type: integer
 *           description: The current/latest version number.
 *         amount:
 *           type: number
 *           format: decimal
 *           description: The amount of the current version.
 *         currency:
 *           type: string
 *           description: The currency of the current version.
 *         from_accounts:
 *           type: array
 *           description: Accounts that are credited (money flows FROM).
 *           items:
 *             $ref: '#/components/schemas/AccountSummary'
 *         to_accounts:
 *           type: array
 *           description: Accounts that are debited (money flows TO).
 *           items:
 *             $ref: '#/components/schemas/AccountSummary'
 *         status:
 *           $ref: '#/components/schemas/TransactionStatusEnum'
 *           description: The status of the current version.
 *         versions:
 *           type: array
 *           description: All versions of this logical transaction.
 *           items:
 *             $ref: '#/components/schemas/TransactionResponse'
 *     TransactionsListResponse:
 *       type: array
 *       items:
 *         $ref: '#/components/schemas/GroupedTransactionResponse'
 *     TransactionStatusEnum:
 *       type: string
 *       enum:
 *         - EXPECTED
 *         - POSTED
 *         - MISMATCH
 *         - ARCHIVED
 */

// Currently, transactions are primarily created internally by the recon engine.
// If direct API creation/update of transactions is needed later,
// CreateTransactionRequest and UpdateTransactionRequest can be defined here.

import { AccountSummary } from './account.types';

export interface TransactionResponse {
  transaction_id: string;
  logical_transaction_id: string;
  version: number;
  amount: number | string; // Can be Decimal from Prisma
  currency: string;
  merchant_id: string;
  status: TransactionStatus;
  created_at: Date;
  updated_at: Date;
  discarded_at?: Date | null;
  metadata?: any | null; // Prisma's JsonValue can be complex
  entries?: EntryResponse[]; // Array of associated entries
}

export interface GroupedTransactionResponse {
  logical_transaction_id: string;
  current_version: number;
  amount: number | string;
  currency: string;
  from_accounts: AccountSummary[];
  to_accounts: AccountSummary[];
  status: TransactionStatus;
  versions: TransactionResponse[];
}
