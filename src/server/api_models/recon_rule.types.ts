// API Models for ReconRule Entity (Request/Response DTOs)
import { AccountType } from '@prisma/client';

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateReconRuleRequest:
 *       type: object
 *       required:
 *         - merchant_id
 *         - account_one_id
 *         - account_two_id
 *       properties:
 *         merchant_id:
 *           type: string
 *           description: The ID of the merchant this rule belongs to.
 *         account_one_id:
 *           type: string
 *           format: uuid
 *           description: The ID of the first account in the rule pair.
 *         account_two_id:
 *           type: string
 *           format: uuid
 *           description: The ID of the second account in the rule pair.
 *
 *     ReconRuleResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: cuid
 *           description: The unique identifier for the reconciliation rule.
 *         merchant_id:
 *           type: string
 *           description: The ID of the merchant this rule belongs to.
 *         account_one_id:
 *           type: string
 *           format: uuid
 *         account_two_id:
 *           type: string
 *           format: uuid
 *         accountOne:
 *           $ref: '#/components/schemas/AccountInfo'
 *           description: Details of the first account in the rule pair.
 *         accountTwo:
 *           $ref: '#/components/schemas/AccountInfo'
 *           description: Details of the second account in the rule pair.
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     AccountInfo:
 *       type: object
 *       properties:
 *         account_id:
 *           type: string
 *           format: uuid
 *           description: The unique identifier for the account.
 *         account_name:
 *           type: string
 *           description: The name of the account.
 *         merchant_id:
 *           type: string
 *           description: The ID of the merchant this account belongs to.
 *
 *     ReconRulesListResponse:
 *       type: array
 *       items:
 *         $ref: '#/components/schemas/ReconRuleResponse'
 */

export interface CreateReconRuleRequest {
  merchant_id: string;
  account_one_id: string;
  account_two_id: string;
}

// UpdateReconRuleRequest might not be needed if rules are immutable or replaced.
// If updatable, it could be Partial<CreateReconRuleRequest> or more specific.
// export interface UpdateReconRuleRequest extends Partial<CreateReconRuleRequest> {}

export interface AccountInfo {
  account_id: string;
  account_name: string;
  merchant_id: string;
}

export interface ReconRuleResponse {
  id: string;
  merchant_id: string;
  account_one_id: string;
  account_two_id: string;
  accountOne: AccountInfo;
  accountTwo: AccountInfo;
  created_at: Date;
  updated_at: Date;
}
