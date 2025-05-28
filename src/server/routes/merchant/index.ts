import express, { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { createMerchant, listMerchants } from '../../core/merchant';
import { CreateMerchantRequest, MerchantResponse } from '../../api_models/merchant.types'; // Import new types

const router: Router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Merchants
 *   description: Merchant account management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     # Merchant and NewMerchant schemas are now defined in merchant.types.ts
 *     # and will be referenced directly by their names:
 *     # CreateMerchantRequest, MerchantResponse, MerchantsListResponse
 */

/**
 * @swagger
 * /merchants:
 *   post:
 *     summary: Create a new merchant account
 *     tags: [Merchants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMerchantRequest' # Updated schema ref
 *     responses:
 *       201:
 *         description: Merchant account created successfully.
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *             description: The URL of the newly created merchant.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MerchantResponse' # Updated schema ref
 *       400:
 *         description: Bad request (e.g., missing fields, invalid data type).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "merchant_id and merchant_name are required."
 *       409:
 *         description: Conflict (e.g., merchant_id already exists).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Merchant with ID 'merchant001' already exists."
 *       500:
 *         description: Internal server error.
 */
const createMerchantHandler: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Use the new API model for request body typing
        const { merchant_name } = req.body as CreateMerchantRequest;

        // Basic validation (more robust validation can be added, e.g., with Zod/Joi)
        if (!merchant_name) {
            // Consider using AppError for consistency if error handling is standardized
            res.status(400).json({ error: 'merchant_name is required.' });
            return;
        }
        if (typeof merchant_name !== 'string') {
            res.status(400).json({ error: 'merchant_name must be a string.' });
            return;
        }
        const newMerchantData = await createMerchant({ merchant_name });

        // Manually map Prisma model to API model
        const responseMerchant: MerchantResponse = {
            merchant_id: newMerchantData.merchant_id, // Keep merchant_id as merchant_id
            merchant_name: newMerchantData.merchant_name,
            created_at: newMerchantData.created_at,
            updated_at: newMerchantData.updated_at,
        };
        res.status(201).location(`/api/merchants/${responseMerchant.merchant_id}`).json(responseMerchant);
    } catch (error) {
        next(error);
    }
};
router.post('/', createMerchantHandler as RequestHandler); // Cast if Express types clash

// GET /api/merchants - List all merchants
/**
 * @swagger
 * /merchants:
 *   get:
 *     summary: List all merchant accounts
 *     tags: [Merchants]
 *     responses:
 *       200:
 *         description: A list of merchant accounts.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MerchantsListResponse' # Updated schema ref
 *       500:
 *         description: Internal server error.
 */
const listMerchantsHandler: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const merchantDataList = await listMerchants();
        // Manually map array of Prisma models to array of API models
        const responseMerchants: MerchantResponse[] = merchantDataList.map(merchantData => ({
            merchant_id: merchantData.merchant_id,
            merchant_name: merchantData.merchant_name,
            created_at: merchantData.created_at,
            updated_at: merchantData.updated_at,
        }));
        res.status(200).json(responseMerchants);
    } catch (error) {
        next(error);
    }
};
router.get('/', listMerchantsHandler as RequestHandler); // Cast if Express types clash

export default router;
