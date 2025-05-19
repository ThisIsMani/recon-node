// tests/accounts/accounts.js
const request = require('supertest');
const app = require('../../src/app'); // Adjust path as necessary
const prisma = require('../../src/services/prisma'); // Adjust path as necessary

describe('Account API Endpoints', () => {
  let testMerchant;

  beforeAll(async () => {
    // Create a dedicated merchant for these account tests
    // This ensures independence from merchant tests and provides a consistent merchant ID
    try {
      testMerchant = await prisma.merchantAccount.create({
        data: { merchant_id: 'acc_api_test_m001', merchant_name: 'Account API Test Merchant' },
      });
    } catch (e) {
      // In case of a previous unclean exit, the merchant might exist. Try to fetch.
      testMerchant = await prisma.merchantAccount.findUnique({ where: { merchant_id: 'acc_api_test_m001' } });
      if (!testMerchant) {
        // If it truly doesn't exist and creation failed, something is wrong with the test setup/DB.
        console.error("Failed to create or find test merchant for account tests.", e);
        throw e; 
      }
    }
  });

  afterEach(async () => {
    // Clean up any accounts created under the testMerchant to ensure test independence
    if (testMerchant) {
      try {
        await prisma.account.deleteMany({ where: { merchant_id: testMerchant.merchant_id } });
      } catch (error) {
        // console.error('Error in afterEach cleanup for accounts:', error.message);
      }
    }
  });

  afterAll(async () => {
    // Clean up the test merchant created for this suite
    if (testMerchant) {
      try {
        await prisma.merchantAccount.delete({ where: { merchant_id: testMerchant.merchant_id } });
      } catch (error) {
        // console.error('Error in afterAll cleanup for test merchant:', error.message);
      }
    }
    // Disconnect Prisma client
    await prisma.$disconnect();
  });

  describe('POST /api/merchants/:merchant_id/accounts', () => {
    it('should create a new account successfully for an existing merchant', async () => {
      const response = await request(app)
        .post(`/api/merchants/${testMerchant.merchant_id}/accounts`)
        .send({ account_name: 'Operating Account', account_type: 'DEBIT_NORMAL', currency: 'USD' });
      
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('account_id');
      expect(response.body.merchant_id).toBe(testMerchant.merchant_id);
      expect(response.body.account_name).toBe('Operating Account');
      expect(response.body.account_type).toBe('DEBIT_NORMAL');
      expect(response.body.currency).toBe('USD');
      expect(response.body).not.toHaveProperty('created_at');
      expect(response.body).not.toHaveProperty('updated_at');

      const dbAccount = await prisma.account.findUnique({ where: { account_id: response.body.account_id } });
      expect(dbAccount).not.toBeNull();
      expect(dbAccount.account_name).toBe('Operating Account');
    });

    it('should return 400 if merchant_id does not exist', async () => {
      const response = await request(app)
        .post('/api/merchants/nonexistent_m123/accounts')
        .send({ account_name: 'Ghost Account', account_type: 'CREDIT_NORMAL', currency: 'JPY' });
      
      expect(response.statusCode).toBe(400); // As per current route error handling
      expect(response.body.error).toContain('Merchant with ID nonexistent_m123 not found');
    });

    it('should return 400 for missing account_name', async () => {
      const response = await request(app)
        .post(`/api/merchants/${testMerchant.merchant_id}/accounts`)
        .send({ account_type: 'DEBIT_NORMAL', currency: 'USD' }); // account_name missing
      
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 400 for invalid account_type', async () => {
        const response = await request(app)
          .post(`/api/merchants/${testMerchant.merchant_id}/accounts`)
          .send({ account_name: 'Invalid Type Acc', account_type: 'INVALID_TYPE', currency: 'CAD' });
        
        // This depends on Prisma validation for enums. Prisma typically throws an error that leads to a generic server error
        // if not specifically handled. The core logic now throws "Invalid input for account creation..."
        // which the route handler maps to a 400.
        expect(response.statusCode).toBe(400); 
        expect(response.body.error).toMatch(/Invalid input for account creation. Details:.*AccountType/); 
      });
  });

  describe('GET /api/merchants/:merchant_id/accounts', () => {
    it('should return an empty list if no accounts exist for the merchant', async () => {
      const response = await request(app).get(`/api/merchants/${testMerchant.merchant_id}/accounts`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return a list of accounts for the merchant', async () => {
      await prisma.account.create({
        data: { 
          account_name: 'Savings EUR', 
          account_type: 'DEBIT_NORMAL', 
          currency: 'EUR', 
          merchant_id: testMerchant.merchant_id 
        }
      });
      await prisma.account.create({
        data: { 
          account_name: 'Checking USD', 
          account_type: 'DEBIT_NORMAL', 
          currency: 'USD', 
          merchant_id: testMerchant.merchant_id 
        }
      });

      const response = await request(app).get(`/api/merchants/${testMerchant.merchant_id}/accounts`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ account_name: 'Savings EUR', currency: 'EUR', posted_balance: '0.00' }),
          expect.objectContaining({ account_name: 'Checking USD', currency: 'USD', pending_balance: '0.00' }),
        ])
      );
    });
  });

  describe('DELETE /api/merchants/:merchant_id/accounts/:account_id', () => {
    let accountToDelete;
    beforeEach(async () => { // Create a fresh account before each DELETE test
      accountToDelete = await prisma.account.create({
        data: { 
          account_name: 'Account To Be Deleted', 
          account_type: 'CREDIT_NORMAL', 
          currency: 'GBP', 
          merchant_id: testMerchant.merchant_id 
        }
      });
    });

    it('should delete an account successfully', async () => {
      const response = await request(app)
        .delete(`/api/merchants/${testMerchant.merchant_id}/accounts/${accountToDelete.account_id}`);
      
      expect(response.statusCode).toBe(200);
      expect(response.body.account_id).toBe(accountToDelete.account_id);

      const dbAccount = await prisma.account.findUnique({ where: { account_id: accountToDelete.account_id } });
      expect(dbAccount).toBeNull();
    });

    it('should return 404 if account_id does not exist', async () => {
      const response = await request(app)
        .delete(`/api/merchants/${testMerchant.merchant_id}/accounts/nonexistent-uuid-format`);
      
      expect(response.statusCode).toBe(404);
      expect(response.body.error).toContain('Account with ID nonexistent-uuid-format not found');
    });

    it('should return 404 if account belongs to a different merchant', async () => {
      // Create a temporary "other" merchant
      const otherMerchant = await prisma.merchantAccount.create({
        data: { merchant_id: 'acc_api_other_m002', merchant_name: 'Other Test Merchant' },
      });

      const response = await request(app)
        .delete(`/api/merchants/${otherMerchant.merchant_id}/accounts/${accountToDelete.account_id}`);
      
      expect(response.statusCode).toBe(404);
      expect(response.body.error).toContain(`does not belong to merchant ${otherMerchant.merchant_id}`);

      // Clean up otherMerchant
      await prisma.merchantAccount.delete({ where: { merchant_id: otherMerchant.merchant_id } });
    });
  });
});
