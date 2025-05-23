// API Models for Transaction Entity (Request/Response DTOs)
import { TransactionStatus } from '@prisma/client'; // Assuming TransactionStatus enum is used

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
 *     TransactionsListResponse:
 *       type: array
 *       items:
 *         $ref: '#/components/schemas/TransactionResponse'
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

export interface TransactionResponse {
  transaction_id: string;
  logical_transaction_id: string;
  version: number;
  merchant_id: string;
  status: TransactionStatus;
  created_at: Date;
  updated_at: Date;
  discarded_at?: Date | null;
  metadata?: any | null; // Prisma's JsonValue can be complex
  // Consider adding entries here if they are part of the standard response:
  // entries?: EntryResponse[]; 
}
