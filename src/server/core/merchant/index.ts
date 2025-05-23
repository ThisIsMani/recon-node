import prisma from '../../../services/prisma';
import logger from '../../../services/logger';
import { MerchantAccount } from '@prisma/client'; // Import Prisma generated type

interface MerchantData {
    merchant_id: string;
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
 * @param {MerchantData} merchantData - Data for the new merchant.
 * @returns {Promise<MerchantAccount>} The created merchant account.
 * @throws {Error} If a merchant with the same ID already exists or other DB error.
 */
const createMerchant = async (merchantData: MerchantData): Promise<MerchantAccount> => {
    try {
        const newMerchant = await prisma.merchantAccount.create({
            data: {
                merchant_id: merchantData.merchant_id,
                merchant_name: merchantData.merchant_name,
            },
        });
        return newMerchant;
    } catch (error) {
        const prismaError = error as PrismaError;
        // Prisma throws specific error codes, e.g., P2002 for unique constraint violation
        if (prismaError.code === 'P2002' && prismaError.meta?.target?.includes('merchant_id')) {
            throw new Error(`Merchant with ID '${merchantData.merchant_id}' already exists.`);
        }
        logger.error('Error creating merchant:', error);
        throw new Error('Could not create merchant account.'); // Generic error for client
    }
};

/**
 * Lists all merchant accounts.
 * @returns {Promise<MerchantAccount[]>} A list of all merchant accounts.
 * @throws {Error} If there's a database error.
 */
const listMerchants = async (): Promise<MerchantAccount[]> => {
    try {
        const merchants = await prisma.merchantAccount.findMany();
        return merchants;
    } catch (error) {
        logger.error('Error listing merchants:', error);
        throw new Error('Could not retrieve merchant accounts.');
    }
};

export {
    createMerchant,
    listMerchants,
};
