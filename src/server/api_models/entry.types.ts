// API Models for Entry Entity (Request/Response DTOs)
import { EntryType, EntryStatus as PrismaEntryStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library'; // For amount
import { AccountSummary } from './account.types';

/**
 * @openapi
 * components:
 *   schemas:
 *     # AccountInfo is now replaced by AccountSummary from account.types.ts
 *     TransactionInfo:
 *       type: object
 *       properties:
 *         transaction_id:
 *           type: string
 *           format: cuid
 *           description: The ID of the transaction.
 *         logical_transaction_id:
 *           type: string
 *           description: The logical ID of the transaction (for grouping related transactions).
 *         status:
 *           type: string
 *           enum: [EXPECTED, POSTED, ARCHIVED, MISMATCH]
 *           description: The status of the transaction.
 *         version:
 *           type: integer
 *           description: The version of the transaction (incremented when transactions evolve).
 *     EntryResponse:
 *       type: object
 *       properties:
 *         entry_id:
 *           type: string
 *           format: cuid
 *           description: The unique identifier for the entry.
 *         account:
 *           $ref: '#/components/schemas/AccountSummary'
 *           nullable: true
 *           description: Information about the account this entry belongs to.
 *         transaction_id:
 *           type: string
 *           format: cuid
 *           description: The ID of the transaction this entry is part of.
 *         entry_type:
 *           $ref: '#/components/schemas/EntryTypeEnum'
 *         amount:
 *           type: number
 *           format: decimal
 *           description: The amount of the entry.
 *         currency:
 *           type: string
 *           description: The currency of the entry.
 *         status:
 *           $ref: '#/components/schemas/EntryStatusEnum'
 *         effective_date:
 *           type: string
 *           format: date-time
 *           description: The effective date of the entry.
 *         metadata:
 *           type: object
 *           nullable: true
 *           description: Additional metadata for the entry.
 *         transaction:
 *           $ref: '#/components/schemas/TransactionInfo'
 *           nullable: true
 *           description: Information about the associated transaction.
 *         discarded_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Timestamp if the entry was discarded.
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp of creation.
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp of last update.
 *     EntriesListResponse:
 *       type: array
 *       items:
 *         $ref: '#/components/schemas/EntryResponse'
 *     EntryTypeEnum:
 *       type: string
 *       enum:
 *         - DEBIT
 *         - CREDIT
 *     EntryStatusEnum: # Renamed from PrismaEntryStatus to avoid conflict if re-exported
 *       type: string
 *       enum:
 *         - EXPECTED
 *         - POSTED
 *         - ARCHIVED
 */

// Entries are typically created via internal processes (e.g., transaction creation).
// If direct API creation is needed, a CreateEntryRequest would be defined here.

// AccountInfo removed - using AccountSummary from account.types.ts instead

export interface TransactionInfo {
  transaction_id: string;
  logical_transaction_id: string;
  status: string;
  version: number;
}

export interface EntryResponse {
  entry_id: string;
  account?: AccountSummary | null;
  transaction_id: string;
  entry_type: EntryType;
  amount: Decimal | number; // API might return number, Prisma uses Decimal
  currency: string;
  status: PrismaEntryStatus;
  effective_date: Date; // Or string if formatted
  metadata?: any | null;
  transaction?: TransactionInfo | null;
  discarded_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}
