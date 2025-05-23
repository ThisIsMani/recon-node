// API Models for ProcessTracker Entity (Request/Response DTOs)
import { ProcessTaskType, ProcessTaskStatus } from '@prisma/client';

/**
 * @openapi
 * components:
 *   schemas:
 *     ProcessTrackerResponse:
 *       type: object
 *       properties:
 *         task_id:
 *           type: string
 *           format: cuid
 *           description: The unique identifier for the task.
 *         task_type:
 *           $ref: '#/components/schemas/ProcessTaskTypeEnum'
 *         payload:
 *           type: object
 *           description: The payload associated with the task.
 *         status:
 *           $ref: '#/components/schemas/ProcessTaskStatusEnum'
 *         attempts:
 *           type: integer
 *           description: Number of processing attempts.
 *         last_error:
 *           type: string
 *           nullable: true
 *           description: Error message from the last failed attempt.
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         processing_started_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         completed_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *
 *     ProcessTrackersListResponse:
 *       type: array
 *       items:
 *         $ref: '#/components/schemas/ProcessTrackerResponse'
 * 
 *     ProcessTaskTypeEnum:
 *       type: string
 *       enum:
 *         - PROCESS_STAGING_ENTRY
 *         # Add other task types as they are defined
 * 
 *     ProcessTaskStatusEnum:
 *       type: string
 *       enum:
 *         - PENDING
 *         - PROCESSING
 *         - COMPLETED
 *         - FAILED
 *         - RETRY
 */

// ProcessTracker tasks are typically managed internally.
// If direct API interaction is needed, request types can be added here.

export interface ProcessTrackerResponse {
  task_id: string;
  task_type: ProcessTaskType;
  payload: any; // Prisma.JsonValue can be complex
  status: ProcessTaskStatus;
  attempts: number;
  last_error?: string | null;
  created_at: Date;
  updated_at: Date;
  processing_started_at?: Date | null;
  completed_at?: Date | null;
}
