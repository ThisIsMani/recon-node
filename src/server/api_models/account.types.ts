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
 *         initial_balance:
 *           type: number
 *           format: decimal
 *           description: The initial balance for the account (optional, defaults to 0).
 *           example: 1000.00
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
 *         initial_balance:
 *           type: string
 *           description: The initial balance of the account.
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
 *     AccountSummary:
 *       type: object
 *       description: Simplified account information for use in related entities
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
 */
export interface CreateAccountRequest {
  merchant_id: string;
  account_name: string;
  account_type: AccountType; // Enum from Prisma
  currency: string;
  initial_balance?: number | string;
}

export interface UpdateAccountRequest extends Partial<CreateAccountRequest> {}

export interface AccountResponse {
  account_id: string;
  merchant_id: string;
  account_name: string;
  account_type: AccountType;
  currency: string;
  initial_balance: string;
  created_at: Date;
  updated_at: Date;
}

// Simplified account type for use in other entities (entries, transactions)
export interface AccountSummary {
  account_id: string;
  merchant_id: string;
  account_name: string;
  account_type: AccountType;
}
