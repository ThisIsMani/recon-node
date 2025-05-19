const prisma = require('../../../services/prisma'); // Adjusted path to Prisma service

/**
 * Creates a new merchant account.
 * @param {object} merchantData - Data for the new merchant.
 * @param {string} merchantData.merchant_id - The ID of the merchant.
 * @param {string} merchantData.merchant_name - The name of the merchant.
 * @returns {Promise<object>} The created merchant account.
 * @throws {Error} If a merchant with the same ID already exists or other DB error.
 */
const createMerchant = async (merchantData) => {
    try {
        const newMerchant = await prisma.merchantAccount.create({
            data: {
                merchant_id: merchantData.merchant_id,
                merchant_name: merchantData.merchant_name,
            },
        });
        return newMerchant;
    } catch (error) {
        // Prisma throws specific error codes, e.g., P2002 for unique constraint violation
        if (error.code === 'P2002' && error.meta?.target?.includes('merchant_id')) {
            throw new Error(`Merchant with ID '${merchantData.merchant_id}' already exists.`);
        }
        // Log the original error for server-side debugging
        console.error('Error creating merchant:', error);
        throw new Error('Could not create merchant account.'); // Generic error for client
    }
};

/**
 * Lists all merchant accounts.
 * @returns {Promise<Array<object>>} A list of all merchant accounts.
 * @throws {Error} If there's a database error.
 */
const listMerchants = async () => {
    try {
        const merchants = await prisma.merchantAccount.findMany();
        return merchants;
    } catch (error) {
        console.error('Error listing merchants:', error);
        throw new Error('Could not retrieve merchant accounts.');
    }
};

module.exports = {
    createMerchant,
    listMerchants,
};
