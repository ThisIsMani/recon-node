import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/services/prisma';
import logger from '../../src/services/logger'; // Assuming logger might be used or spied on
import { MerchantAccount, Account as PrismaAccount } from '@prisma/client'; // Import Prisma types
import { Express } from 'express';

const mockPrismaClient = prisma as any; // For easier mocking

describe('Account API Endpoints', () => {
  let testMerchant: MerchantAccount | null;
  let server: Express;

  beforeAll(async () => {
    server = app;
    try {
      testMerchant = await mockPrismaClient.merchantAccount.create({
        data: { merchant_id: 'acc_api_test_m001', merchant_name: 'Account API Test Merchant' },
      });
    } catch (e) {
      testMerchant = await mockPrismaClient.merchantAccount.findUnique({ where: { merchant_id: 'acc_api_test_m001' } });
      if (!testMerchant) {
        logger.error("Failed to create or find test merchant for account tests.", e);
        throw e; 
      }
    }
  });

  afterEach(async () => {
    if (testMerchant) {
      try {
        await mockPrismaClient.account.deleteMany({ where: { merchant_id: testMerchant.merchant_id } });
      } catch (error) {
        // console.error('Error in afterEach cleanup for accounts:', (error as Error).message);
      }
    }
  });

  afterAll(async () => {
    if (testMerchant) {
      try {
        await mockPrismaClient.merchantAccount.delete({ where: { merchant_id: testMerchant.merchant_id } });
      } catch (error) {
        // console.error('Error in afterAll cleanup for test merchant:', (error as Error).message);
      }
    }
    await mockPrismaClient.$disconnect();
  });

  describe('POST /api/merchants/:merchant_id/accounts', () => {
    it('should create a new account successfully for an existing merchant', async () => {
      const response = await request(server)
        .post(`/api/merchants/${testMerchant!.merchant_id}/accounts`)
        .send({ account_name: 'Operating Account', account_type: 'DEBIT_NORMAL', currency: 'USD' });
      
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('account_id');
      expect(response.body.merchant_id).toBe(testMerchant!.merchant_id);
      expect(response.body.account_name).toBe('Operating Account');
      expect(response.body.account_type).toBe('DEBIT_NORMAL');
      expect(response.body.currency).toBe('USD');
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('updated_at');
      expect(new Date(response.body.created_at).toISOString()).toBe(response.body.created_at);
      expect(new Date(response.body.updated_at).toISOString()).toBe(response.body.updated_at);

      const dbAccount = await mockPrismaClient.account.findUnique({ where: { account_id: response.body.account_id } });
      expect(dbAccount).not.toBeNull();
      if (dbAccount) {
        expect(dbAccount.account_name).toBe('Operating Account');
      }
    });

    it('should return 400 if merchant_id does not exist', async () => {
      const response = await request(server)
        .post('/api/merchants/nonexistent_m123/accounts')
        .send({ account_name: 'Ghost Account', account_type: 'CREDIT_NORMAL', currency: 'JPY' });
      
      expect(response.statusCode).toBe(404); // Changed from 400 to 404
      expect(response.body.error).toBe("Merchant with identifier 'nonexistent_m123' not found."); // Updated message
    });

    it('should return 400 for missing account_name', async () => {
      const response = await request(server)
        .post(`/api/merchants/${testMerchant!.merchant_id}/accounts`)
        .send({ account_type: 'DEBIT_NORMAL', currency: 'USD' });
      
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 400 for invalid account_type', async () => {
        const response = await request(server)
          .post(`/api/merchants/${testMerchant!.merchant_id}/accounts`)
          .send({ account_name: 'Invalid Type Acc', account_type: 'INVALID_TYPE', currency: 'CAD' });
        
        expect(response.statusCode).toBe(400); 
        expect(response.body.error).toBe('Invalid account_type. Must be one of: DEBIT_NORMAL, CREDIT_NORMAL'); 
      });
  });

  describe('GET /api/merchants/:merchant_id/accounts', () => {
    it('should return an empty list if no accounts exist for the merchant', async () => {
      const response = await request(server).get(`/api/merchants/${testMerchant!.merchant_id}/accounts`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return a list of accounts for the merchant', async () => {
      // Mock data should include timestamps if the core layer returns them
      const date1 = new Date();
      const date2 = new Date(Date.now() - 100000); // Ensure different timestamps for variety
      await mockPrismaClient.account.create({
        data: { 
          account_name: 'Savings EUR', 
          account_type: 'DEBIT_NORMAL', 
          currency: 'EUR', 
          merchant_id: testMerchant!.merchant_id,
          created_at: date1, // Prisma returns these
          updated_at: date1
        }
      });
      await mockPrismaClient.account.create({
        data: { 
          account_name: 'Checking USD', 
          account_type: 'DEBIT_NORMAL', 
          currency: 'USD', 
          merchant_id: testMerchant!.merchant_id,
          created_at: date2,
          updated_at: date2
        }
      });

      const response = await request(server).get(`/api/merchants/${testMerchant!.merchant_id}/accounts`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(2);
      
      const expectedAccountsDetails = [
        { account_name: 'Savings EUR', currency: 'EUR', account_type: 'DEBIT_NORMAL' },
        { account_name: 'Checking USD', currency: 'USD', account_type: 'DEBIT_NORMAL' }
      ];

      response.body.forEach((acc: any) => {
        expect(acc).toHaveProperty('account_id');
        expect(acc).toHaveProperty('merchant_id', testMerchant!.merchant_id);
        expect(acc).toHaveProperty('account_name');
        expect(acc).toHaveProperty('account_type');
        expect(acc).toHaveProperty('currency');
        expect(acc).toHaveProperty('created_at');
        expect(acc).toHaveProperty('updated_at');
        expect(new Date(acc.created_at).toISOString()).toBe(acc.created_at);
        expect(new Date(acc.updated_at).toISOString()).toBe(acc.updated_at);

        // Check if the account from response matches one of the expected accounts
        const matchedExpectedAccount = expectedAccountsDetails.find(
          expected => expected.account_name === acc.account_name &&
                      expected.currency === acc.currency &&
                      expected.account_type === acc.account_type
        );
        expect(matchedExpectedAccount).toBeDefined();
      });
    });
  });

  describe('PUT /api/merchants/:merchant_id/accounts/:account_id', () => {
    let existingAccount: PrismaAccount | null;
    let originalUpdatedAt: Date | null;

    beforeEach(async () => {
      const createdAccount = await mockPrismaClient.account.create({
        data: {
          account_name: 'Initial Account Name',
          account_type: 'DEBIT_NORMAL',
          currency: 'USD',
          merchant_id: testMerchant!.merchant_id,
        },
      });
      existingAccount = await mockPrismaClient.account.findUnique({ where: { account_id: createdAccount.account_id } });
      originalUpdatedAt = existingAccount!.updated_at;
    });

    it('should update an account name successfully', async () => {
      const newAccountName = 'Updated Account Name';
      const response = await request(server)
        .put(`/api/merchants/${testMerchant!.merchant_id}/accounts/${existingAccount!.account_id}`)
        .send({ account_name: newAccountName });

      expect(response.statusCode).toBe(200);
      expect(response.body.account_id).toBe(existingAccount!.account_id);
      expect(response.body.merchant_id).toBe(testMerchant!.merchant_id);
      expect(response.body.account_name).toBe(newAccountName);
      expect(response.body.account_type).toBe(existingAccount!.account_type);
      expect(response.body.currency).toBe(existingAccount!.currency);
      expect(response.body).toHaveProperty('created_at'); // Should now be present
      expect(response.body).toHaveProperty('updated_at'); // Should now be present
      expect(new Date(response.body.created_at).toISOString()).toBe(response.body.created_at);
      expect(new Date(response.body.updated_at).toISOString()).not.toBe(originalUpdatedAt!.toISOString()); // updated_at should change

      const dbAccount = await mockPrismaClient.account.findUnique({ where: { account_id: existingAccount!.account_id } });
      expect(dbAccount).not.toBeNull();
      if (dbAccount) {
        expect(dbAccount.account_name).toBe(newAccountName);
        expect(dbAccount.updated_at.toISOString()).not.toBe(originalUpdatedAt!.toISOString());
      }
    });

    it('should ignore attempts to update immutable fields like currency', async () => {
      const newAccountName = 'Name Change Only';
      const attemptedNewCurrency = 'EUR';
      const response = await request(server)
        .put(`/api/merchants/${testMerchant!.merchant_id}/accounts/${existingAccount!.account_id}`)
        .send({ account_name: newAccountName, currency: attemptedNewCurrency });

      expect(response.statusCode).toBe(200);
      expect(response.body.account_name).toBe(newAccountName);
      expect(response.body.currency).toBe(existingAccount!.currency);

      const dbAccount = await mockPrismaClient.account.findUnique({ where: { account_id: existingAccount!.account_id } });
      if (dbAccount) {
        expect(dbAccount.currency).toBe(existingAccount!.currency);
        expect(dbAccount.account_name).toBe(newAccountName);
        expect(dbAccount.updated_at.toISOString()).not.toBe(originalUpdatedAt!.toISOString());
      }
    });
    
    it('should return 400 for invalid payload (e.g., empty account_name)', async () => {
      const response = await request(server)
        .put(`/api/merchants/${testMerchant!.merchant_id}/accounts/${existingAccount!.account_id}`)
        .send({ account_name: '' }); 

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error).toMatch(/Missing or invalid required field: account_name \(must be a non-empty string\)/i);

      const dbAccount = await mockPrismaClient.account.findUnique({ where: { account_id: existingAccount!.account_id } });
      if (dbAccount) {
        expect(dbAccount.account_name).toBe(existingAccount!.account_name);
        expect(dbAccount.updated_at.toISOString()).toBe(originalUpdatedAt!.toISOString());
      }
    });

    it('should return 404 if account_id does not exist', async () => {
      const nonExistentAccountId = 'acc_nonexistent_uuid_put';
      const response = await request(server)
        .put(`/api/merchants/${testMerchant!.merchant_id}/accounts/${nonExistentAccountId}`)
        .send({ account_name: 'Trying to update ghost' });

      expect(response.statusCode).toBe(404);
      expect(response.body.error).toBe(`Account with identifier '${nonExistentAccountId}' not found.`); // Updated message
    }, 10000); // Increase timeout to 10 seconds

    it('should return 404 if merchant_id in URL does not exist', async () => {
      const nonExistentMerchantId = 'm_ghost_put_007';
      const response = await request(server)
        .put(`/api/merchants/${nonExistentMerchantId}/accounts/${existingAccount!.account_id}`)
        .send({ account_name: 'Trying with ghost merchant' });
      
      expect(response.statusCode).toBe(404); 
      expect(response.body.error).toBe(`Account with ID ${existingAccount!.account_id} does not belong to merchant ${nonExistentMerchantId} not found.`); // Added " not found."
    });

    it('should return 404 if account belongs to a different merchant', async () => {
      const otherMerchantId = 'acc_api_other_m003_put_unique'; // Made ID more unique
      const otherMerchant = await mockPrismaClient.merchantAccount.create({
        data: { merchant_id: otherMerchantId, merchant_name: 'Other Test Merchant For PUT' },
      });

      const response = await request(server)
        .put(`/api/merchants/${otherMerchant.merchant_id}/accounts/${existingAccount!.account_id}`)
        .send({ account_name: 'Cross-merchant update attempt' });

      expect(response.statusCode).toBe(404);
      expect(response.body.error).toBe(`Account with ID ${existingAccount!.account_id} does not belong to merchant ${otherMerchant.merchant_id} not found.`); // Added " not found."
      
      await mockPrismaClient.merchantAccount.delete({ where: { merchant_id: otherMerchantId } }); // Ensure cleanup
      
      const dbAccount = await mockPrismaClient.account.findUnique({ where: { account_id: existingAccount!.account_id } });
      if (dbAccount) {
        expect(dbAccount.account_name).toBe(existingAccount!.account_name);
        expect(dbAccount.updated_at.toISOString()).toBe(originalUpdatedAt!.toISOString());
      }
    });
  });

  describe('DELETE /api/merchants/:merchant_id/accounts/:account_id', () => {
    let accountToDelete: PrismaAccount;
    beforeEach(async () => {
      accountToDelete = await mockPrismaClient.account.create({
        data: { 
          account_name: 'Account To Be Deleted', 
          account_type: 'CREDIT_NORMAL', 
          currency: 'GBP', 
          merchant_id: testMerchant!.merchant_id 
        }
      });
    });

    it('should delete an account successfully', async () => {
      const response = await request(server)
        .delete(`/api/merchants/${testMerchant!.merchant_id}/accounts/${accountToDelete.account_id}`);
      
      expect(response.statusCode).toBe(200);
      expect(response.body.account_id).toBe(accountToDelete.account_id);

      const dbAccount = await mockPrismaClient.account.findUnique({ where: { account_id: accountToDelete.account_id } });
      expect(dbAccount).toBeNull();
    });

    it('should return 404 if account_id does not exist', async () => {
      const response = await request(server)
        .delete(`/api/merchants/${testMerchant!.merchant_id}/accounts/nonexistent-uuid-format`);
      
      expect(response.statusCode).toBe(404);
      expect(response.body.error).toBe("Account with identifier 'nonexistent-uuid-format' not found."); // Updated message
    });

    it('should return 404 if account belongs to a different merchant', async () => {
      const otherMerchantId = 'acc_api_other_m004_delete_unique'; // Made ID more unique
      const otherMerchant = await mockPrismaClient.merchantAccount.create({
        data: { merchant_id: otherMerchantId, merchant_name: 'Other Test Merchant For DELETE' },
      });

      const response = await request(server)
        .delete(`/api/merchants/${otherMerchant.merchant_id}/accounts/${accountToDelete.account_id}`);
      
      expect(response.statusCode).toBe(404);
      expect(response.body.error).toBe(`Account with ID ${accountToDelete.account_id} does not belong to merchant ${otherMerchant.merchant_id} not found.`); // Added " not found."

      await mockPrismaClient.merchantAccount.delete({ where: { merchant_id: otherMerchantId } }); // Ensure cleanup
    });
  });
});
