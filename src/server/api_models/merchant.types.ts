// API Models for Merchant Entity (Request/Response DTOs)

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateMerchantRequest:
 *       type: object
 *       required:
 *         - merchant_name
 *       properties:
 *         merchant_name:
 *           type: string
 *           description: The name of the merchant.
 *           example: Acme Corp
 *     MerchantResponse:
 *       type: object
 *       properties:
 *         merchant_id:
 *           type: string
 *           format: uuid
 *           description: The unique identifier for the merchant.
 *           example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef'
 *         merchant_name:
 *           type: string
 *           description: The name of the merchant.
 *           example: Acme Corp
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the merchant was created.
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the merchant was last updated.
 *     MerchantsListResponse:
 *        type: array
 *        items:
 *          $ref: '#/components/schemas/MerchantResponse'
 */
export interface CreateMerchantRequest {
  merchant_name: string;
  // Potentially other properties like contact_email, address, etc.
}

// For now, UpdateMerchantRequest can be a partial of CreateMerchantRequest
// More specific update DTOs can be created if needed.
export interface UpdateMerchantRequest extends Partial<CreateMerchantRequest> {}

export interface MerchantResponse {
  merchant_id: string;
  merchant_name: string;
  // Include other relevant fields that are safe to expose via API
  created_at: Date;
  updated_at: Date;
}
