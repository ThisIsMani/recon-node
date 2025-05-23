// Mock prisma first
jest.mock('../../../src/services/prisma'); 

import { createMerchant, listMerchants } from '../../../src/server/core/merchant';
import prisma from '../../../src/services/prisma'; // This will now be the mock
import { MerchantAccount as PrismaMerchantAccount } from '@prisma/client'; // Use PrismaMerchantAccount for mock setup type
import { Merchant } from '../../../src/server/domain_models/merchant.types'; // Import Domain model

describe('Merchant Core Logic', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => { 
    jest.clearAllMocks(); 
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('createMerchant', () => {
    it('should create a new merchant successfully', async () => {
      const merchantData = { merchant_id: 'merchant123', merchant_name: 'Test Merchant' };
      const mockDate = new Date();
      (prisma.merchantAccount.create as jest.Mock).mockResolvedValueOnce({
        merchant_id: merchantData.merchant_id,
        merchant_name: merchantData.merchant_name,
        created_at: mockDate,
        updated_at: mockDate,
      } as PrismaMerchantAccount); 

      const newMerchant: Merchant = await createMerchant(merchantData);

      expect(newMerchant).toBeDefined();
      expect(newMerchant.merchant_id).toBe(merchantData.merchant_id);
      expect(newMerchant.merchant_name).toBe(merchantData.merchant_name);
      expect(newMerchant.created_at).toEqual(mockDate);
      expect(newMerchant.updated_at).toEqual(mockDate);
    });

    it('should throw an error if merchant ID already exists', async () => {
      const merchantData = { merchant_id: 'merchant123', merchant_name: 'Test Merchant' };
      const mockDate = new Date();
      // Mock first successful creation
      (prisma.merchantAccount.create as jest.Mock).mockResolvedValueOnce({
        merchant_id: merchantData.merchant_id,
        merchant_name: merchantData.merchant_name,
        created_at: mockDate, 
        updated_at: mockDate 
      } as PrismaMerchantAccount);
      await createMerchant(merchantData); 

      // Mock Prisma's create to throw P2002 error for the second attempt
      (prisma.merchantAccount.create as jest.Mock).mockRejectedValueOnce({
        code: 'P2002',
        meta: { target: ['merchant_id'] },
      });

      try {
        await createMerchant(merchantData);
      } catch (error) {
        expect(error).toBeInstanceOf(Error); 
        if (error instanceof Error) { 
            expect(error.message).toBe(`Merchant with ID '${merchantData.merchant_id}' already exists.`);
        }
      }
    });

    it('should throw a generic error for other database issues during creation', async () => {
      const merchantData = { merchant_id: 'merchant-fail', merchant_name: 'Fail Merchant' };
      (prisma.merchantAccount.create as jest.Mock).mockRejectedValueOnce(new Error('Some other DB error'));

      try {
        await createMerchant(merchantData);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) { 
            expect(error.message).toBe('Could not create merchant account.');
        }
      }
    });
  });

  describe('listMerchants', () => {
    it('should return an empty array if no merchants exist', async () => {
      (prisma.merchantAccount.findMany as jest.Mock).mockResolvedValueOnce([]);
      const merchants: Merchant[] = await listMerchants();
      expect(merchants).toEqual([]);
    });

    it('should return a list of merchants if they exist', async () => {
      const mockDate = new Date();
      
      const merchant1Data: PrismaMerchantAccount = { 
        merchant_id: 'merchant1', 
        merchant_name: 'Merchant One', 
        created_at: mockDate, 
        updated_at: mockDate 
      };
      const merchant2Data: PrismaMerchantAccount = { 
        merchant_id: 'merchant2', 
        merchant_name: 'Merchant Two', 
        created_at: mockDate, 
        updated_at: mockDate 
      };
      
      (prisma.merchantAccount.findMany as jest.Mock).mockResolvedValueOnce([merchant1Data, merchant2Data]);

      const merchants: Merchant[] = await listMerchants();
      expect(merchants.length).toBe(2);
      expect(merchants).toEqual(
        expect.arrayContaining([
          expect.objectContaining(merchant1Data as any), // Cast to any for objectContaining
          expect.objectContaining(merchant2Data as any), // Cast to any for objectContaining
        ])
      );
    });

    it('should throw a generic error for database issues during listing', async () => {
      (prisma.merchantAccount.findMany as jest.Mock).mockRejectedValueOnce(new Error('DB list error'));

      try {
        await listMerchants();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) { 
            expect(error.message).toBe('Could not retrieve merchant accounts.');
        }
      }
    });
  });
});
