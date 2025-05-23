// API Models for Account Entity (Request/Response DTOs)
import { AccountType } from '@prisma/client'; // Assuming AccountType enum is used

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateAccountRequest:
 *       type: object
 *       required:
 *         - merchant_id
 *         - account_name
 *         - account_type
 *         - currency
 *       properties:
 *         merchant_id:
 *           type: string
 *           description: The ID of the merchant this account belongs to.
 *         account_name:
 *           type: string
 *           description: The name of the account.
 *           example: "Main Operating Account"
 *         account_type:
 *           $ref: '#/components/schemas/AccountTypeEnum'
 *         currency:
 *           type: string
 *           description: The currency of the account (e.g., USD, EUR).
 *           example: "USD"
 *
 *     AccountResponse:
 *       type: object
 *       properties:
 *         account_id:
 *           type: string
 *           format: uuid
 *           description: The unique identifier for the account.
 *         merchant_id:
 *           type: string
 *           description: The ID of the merchant this account belongs to.
 *         account_name:
 *           type: string
 *           description: The name of the account.
 *         account_type:
 *           $ref: '#/components/schemas/AccountTypeEnum'
 *         currency:
 *           type: string
 *           description: The currency of the account.
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the account was created.
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the account was last updated.
 *
 *     AccountsListResponse:
 *       type: array
 *       items:
 *         $ref: '#/components/schemas/AccountResponse'
 *
 *     AccountTypeEnum: # Define AccountType for Swagger
 *       type: string
 *       enum:
 *         - DEBIT_NORMAL
 *         - CREDIT_NORMAL
 */
export interface CreateAccountRequest {
  merchant_id: string;
  account_name: string;
  account_type: AccountType; // Enum from Prisma
  currency: string;
}

export interface UpdateAccountRequest extends Partial<CreateAccountRequest> {}

export interface AccountResponse {
  account_id: string;
  merchant_id: string;
  account_name: string;
  account_type: AccountType;
  currency: string;
  created_at: Date;
  updated_at: Date;
}
