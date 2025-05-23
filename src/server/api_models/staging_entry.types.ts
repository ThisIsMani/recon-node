// API Models for StagingEntry Entity (Request/Response DTOs)
import { EntryType, StagingEntryStatus, StagingEntryProcessingMode } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateStagingEntryRequest:
 *       type: object
 *       required:
 *         - account_id
 *         - entry_type
 *         - amount
 *         - currency
 *         - effective_date
 *         - processing_mode
 *       properties:
 *         account_id:
 *           type: string
 *           format: uuid
 *         entry_type:
 *           $ref: '#/components/schemas/EntryTypeEnum' # Reuses EntryTypeEnum
 *         amount:
 *           type: number
 *           format: decimal
 *         currency:
 *           type: string
 *         effective_date:
 *           type: string
 *           format: date-time
 *         processing_mode:
 *           $ref: '#/components/schemas/StagingEntryProcessingModeEnum'
 *         metadata:
 *           type: object
 *           nullable: true
 *
 *     StagingEntryResponse:
 *       type: object
 *       properties:
 *         staging_entry_id:
 *           type: string
 *           format: cuid
 *         account_id:
 *           type: string
 *           format: uuid
 *         entry_type:
 *           $ref: '#/components/schemas/EntryTypeEnum'
 *         amount:
 *           type: number
 *           format: decimal
 *         currency:
 *           type: string
 *         status:
 *           $ref: '#/components/schemas/StagingEntryStatusEnum'
 *         processing_mode:
 *           $ref: '#/components/schemas/StagingEntryProcessingModeEnum'
 *         effective_date:
 *           type: string
 *           format: date-time
 *         metadata:
 *           type: object
 *           nullable: true
 *         discarded_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     StagingEntriesListResponse:
 *       type: array
 *       items:
 *         $ref: '#/components/schemas/StagingEntryResponse'
 * 
 *     StagingEntryStatusEnum:
 *       type: string
 *       enum:
 *         - PENDING
 *         - NEEDS_MANUAL_REVIEW
 *         - PROCESSED
 * 
 *     StagingEntryProcessingModeEnum:
 *       type: string
 *       enum:
 *         - CONFIRMATION
 *         - TRANSACTION
 */

export interface CreateStagingEntryRequest {
  account_id: string;
  entry_type: EntryType;
  amount: number | Decimal; // Allow number for API input, convert to Decimal in core
  currency: string;
  effective_date: string | Date;
  processing_mode: StagingEntryProcessingMode;
  metadata?: any | null;
}

export interface StagingEntryResponse {
  staging_entry_id: string;
  account_id: string;
  entry_type: EntryType;
  amount: Decimal | number; // API might return number
  currency: string;
  status: StagingEntryStatus;
  processing_mode: StagingEntryProcessingMode;
  effective_date: Date; // Or string
  metadata?: any | null;
  discarded_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     StagingEntryStatusUpdateRequest:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           $ref: '#/components/schemas/StagingEntryStatusEnum'
 *         metadata:
 *           type: object
 *           nullable: true
 *         discarded_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 */
export interface StagingEntryStatusUpdate { // This could be an API DTO
  status: StagingEntryStatus;
  metadata?: Record<string, any>;
  discarded_at?: Date | null;
}
