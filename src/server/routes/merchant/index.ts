import express, { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { createMerchant, listMerchants } from '../../core/merchant';

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
 *     Merchant:
 *       type: object
 *       required:
 *         - merchant_id
 *         - merchant_name
 *       properties:
 *         merchant_id:
 *           type: string
 *           description: Unique identifier for the merchant.
 *           example: "merchant001"
 *         merchant_name:
 *           type: string
 *           description: Name of the merchant.
 *           example: "Test Merchant One"
 *     NewMerchant:
 *       type: object
 *       required:
 *         - merchant_id
 *         - merchant_name
 *       properties:
 *         merchant_id:
 *           type: string
 *           description: Unique identifier for the merchant.
 *         merchant_name:
 *           type: string
 *           description: Name of the merchant.
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
 *             $ref: '#/components/schemas/NewMerchant'
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
 *               $ref: '#/components/schemas/Merchant'
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
const createMerchantHandler: RequestHandler = async (req, res, next) => {
    try {
        const { merchant_id, merchant_name } = req.body;

        if (!merchant_id || !merchant_name) {
            res.status(400).json({ error: 'merchant_id and merchant_name are required.' });
            return;
        }
        if (typeof merchant_id !== 'string' || typeof merchant_name !== 'string') {
            res.status(400).json({ error: 'merchant_id and merchant_name must be strings.' });
            return;
        }

        const newMerchant = await createMerchant({ merchant_id, merchant_name });
        res.status(201).location(`/api/merchants/${newMerchant.merchant_id}`).json(newMerchant);
    } catch (error) {
        // It's better to let the centralized error handler manage this,
        // but for specific status codes like 409, handling it here is okay.
        if (error instanceof Error && error.message.includes('already exists')) {
            res.status(409).json({ error: error.message });
            return;
        }
        next(error); // Pass other errors to the centralized error handler
    }
};
router.post('/', createMerchantHandler);

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
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Merchant'
 *       500:
 *         description: Internal server error.
 */
const listMerchantsHandler: RequestHandler = async (req, res, next) => {
    try {
        const merchants = await listMerchants();
        res.status(200).json(merchants);
    } catch (error) {
        next(error);
    }
};
router.get('/', listMerchantsHandler);

export default router;
