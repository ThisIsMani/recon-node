import prisma from '../../../services/prisma';
import logger from '../../../services/logger';
// Import the new Domain Model instead of Prisma's directly in function signatures where appropriate
import { Merchant } from '../../domain_models/merchant.types';
import { MerchantAccount } from '@prisma/client'; // Still needed for Prisma operations
import { AppError, NotFoundError, ValidationError, InternalServerError } from '../../../errors/AppError';

// This local interface can be replaced by the imported Merchant domain type or a specific Input DTO type
interface CreateMerchantInput { // Renamed for clarity, could also use a dedicated DTO from domain_models
    merchant_name: string;
}

// Define a type for Prisma errors that include a 'code' and 'meta'
interface PrismaError extends Error {
    code?: string;
    meta?: {
        target?: string[];
    };
}

/**
 * Creates a new merchant account.
 * @param {CreateMerchantInput} merchantInput - Data for the new merchant.
 * @returns {Promise<Merchant>} The created merchant account, typed as the Domain Model.
 * @throws {Error} If a merchant with the same ID already exists or other DB error.
 */
const createMerchant = async (merchantInput: CreateMerchantInput): Promise<Merchant> => {
    try {
        // Generate a unique ID for the merchant
        const merchantId = `merchant_${Date.now()}_${Math.floor(Math.random() * 1000)}`;  

        const newPrismaMerchant = await prisma.merchantAccount.create({
            data: {
                merchant_id: merchantId,
                merchant_name: merchantInput.merchant_name,
            },
        });
        // Cast or map Prisma model to Domain model if they differ.
        // Since our Domain Merchant extends PrismaMerchantAccount, direct assignment is fine.
        return newPrismaMerchant as Merchant;
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        const prismaError = error as PrismaError;
        if (prismaError.code === 'P2002' && prismaError.meta?.target?.includes('merchant_id')) {
            throw new ValidationError(`Error creating merchant with unique ID. Please try again.`);
        }
        logger.error(error as Error, { context: 'Error creating merchant' });
        throw new InternalServerError('Could not create merchant account.'); // Generic error for client
    }
};

/**
 * Lists all merchant accounts.
 * @returns {Promise<Merchant[]>} A list of all merchant accounts, typed as Domain Models.
 * @throws {Error} If there's a database error.
 */
const listMerchants = async (): Promise<Merchant[]> => {
    try {
        const prismaMerchants = await prisma.merchantAccount.findMany();
        // Cast or map Prisma models to Domain models if they differ.
        return prismaMerchants as Merchant[];
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        logger.error(error as Error, { context: 'Error listing merchants' });
        throw new InternalServerError('Could not retrieve merchant accounts.');
    }
};

export {
    createMerchant,
    listMerchants,
};
