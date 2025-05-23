import { createMerchant, listMerchants } from '../../../src/server/core/merchant'; // Will resolve to .ts
import prisma from '../../../src/services/prisma';
import { MerchantAccount } from '@prisma/client';

// Helper to mock Prisma client methods
// We need to cast to 'any' for dynamic mock assignment on the imported prisma instance
const mockPrismaClient = prisma as any;

describe('Merchant Core Logic', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    await mockPrismaClient.merchantAccount.deleteMany({});
    // Spy on console.error and provide a mock implementation to suppress output
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore the original console.error and any other mocks
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
  });

  // Clean up after all tests in this suite are done
  afterAll(async () => {
    await mockPrismaClient.merchantAccount.deleteMany({});
    await mockPrismaClient.$disconnect(); // Disconnect Prisma client
  });

  describe('createMerchant', () => {
    it('should create a new merchant successfully', async () => {
      const merchantData = { merchant_id: 'merchant123', merchant_name: 'Test Merchant' };
      const newMerchant: MerchantAccount = await createMerchant(merchantData);

      expect(newMerchant).toBeDefined();
      expect(newMerchant.merchant_id).toBe(merchantData.merchant_id);
      expect(newMerchant.merchant_name).toBe(merchantData.merchant_name);

      // Verify it's in the database
      const dbMerchant = await mockPrismaClient.merchantAccount.findUnique({
        where: { merchant_id: merchantData.merchant_id },
      });
      expect(dbMerchant).toEqual(newMerchant);
    });

    it('should throw an error if merchant ID already exists', async () => {
      const merchantData = { merchant_id: 'merchant123', merchant_name: 'Test Merchant' };
      await createMerchant(merchantData); // Create first merchant

      // Attempt to create another merchant with the same ID
      try {
        await createMerchant(merchantData);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) { // Type guard for error.message
            expect(error.message).toBe(`Merchant with ID '${merchantData.merchant_id}' already exists.`);
        }
      }
    });

    it('should throw a generic error for other database issues during creation', async () => {
      const merchantData = { merchant_id: 'merchant-fail', merchant_name: 'Fail Merchant' };
      // Mock Prisma's create to throw a non-P2002 error
      jest.spyOn(mockPrismaClient.merchantAccount, 'create').mockRejectedValueOnce(new Error('Some other DB error'));

      try {
        await createMerchant(merchantData);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) { // Type guard
            expect(error.message).toBe('Could not create merchant account.');
        }
      }
    });
  });

  describe('listMerchants', () => {
    it('should return an empty array if no merchants exist', async () => {
      const merchants: MerchantAccount[] = await listMerchants();
      expect(merchants).toEqual([]);
    });

    it('should return a list of merchants if they exist', async () => {
      const merchant1Data = { merchant_id: 'merchant1', merchant_name: 'Merchant One' };
      const merchant2Data = { merchant_id: 'merchant2', merchant_name: 'Merchant Two' };
      await createMerchant(merchant1Data);
      await createMerchant(merchant2Data);

      const merchants: MerchantAccount[] = await listMerchants();
      expect(merchants.length).toBe(2);
      expect(merchants).toEqual(
        expect.arrayContaining([
          expect.objectContaining(merchant1Data),
          expect.objectContaining(merchant2Data),
        ])
      );
    });

    it('should throw a generic error for database issues during listing', async () => {
      // Mock Prisma's findMany to throw an error
      jest.spyOn(mockPrismaClient.merchantAccount, 'findMany').mockRejectedValueOnce(new Error('DB list error'));

      try {
        await listMerchants();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) { // Type guard
            expect(error.message).toBe('Could not retrieve merchant accounts.');
        }
      }
    });
  });
});
