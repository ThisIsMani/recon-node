const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/services/prisma');
const reconRulesCore = require('../../src/server/core/recon-rules'); // For direct core logic calls if needed in tests

describe('Recon Rules API Endpoints', () => {
  let merchant1, account1_m1, account2_m1, account3_m1;

  beforeAll(async () => {
    // Create a merchant and some accounts for testing
    // Ensure merchant_id is unique if this runs multiple times or in parallel with other tests
    try {
      merchant1 = await prisma.merchantAccount.upsert({
        where: { merchant_id: 'recon_m001_jest' },
        update: {},
        create: { merchant_id: 'recon_m001_jest', merchant_name: 'Recon Test Merchant Jest' },
      });

      account1_m1 = await prisma.account.create({
        data: {
          merchant_id: merchant1.merchant_id, // Use merchant_id from MerchantAccount
          account_name: 'Recon Acc One Jest',
          account_type: 'DEBIT_NORMAL',
          currency: 'USD', // Added currency as it's required by schema
        },
      });
      account2_m1 = await prisma.account.create({
        data: {
          merchant_id: merchant1.merchant_id,
          account_name: 'Recon Acc Two Jest',
          account_type: 'CREDIT_NORMAL',
          currency: 'USD',
        },
      });
      account3_m1 = await prisma.account.create({
        data: {
          merchant_id: merchant1.merchant_id,
          account_name: 'Recon Acc Three Jest',
          account_type: 'CREDIT_NORMAL',
          currency: 'USD',
        },
      });
    } catch (e) {
      console.error("Error in beforeAll setup for recon-rules.js:", e);
      throw e;
    }
  });

  afterEach(async () => {
    // Clean up recon rules after each test
    await prisma.reconRule.deleteMany({});
  });

  afterAll(async () => {
    // Clean up test data
    // Note: Order of deletion matters due to foreign key constraints
    await prisma.account.deleteMany({ where: { merchant_id: merchant1.merchant_id } });
    await prisma.merchantAccount.delete({ where: { merchant_id: merchant1.merchant_id } });
    await prisma.$disconnect();
  });

  describe('POST /api/merchants/:merchant_id/recon-rules', () => {
    it('should create a new recon rule successfully', async () => {
      const response = await request(app)
        .post(`/api/merchants/${merchant1.merchant_id}/recon-rules`)
        .send({ account_one_id: account1_m1.account_id, account_two_id: account2_m1.account_id });
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.account_one_id).toBe(account1_m1.account_id);
      expect(response.body.account_two_id).toBe(account2_m1.account_id);
      expect(response.body.merchant_id).toBe(merchant1.merchant_id);
    });

    it('should return 400 if account_one_id is missing', async () => {
      const response = await request(app)
        .post(`/api/merchants/${merchant1.merchant_id}/recon-rules`)
        .send({ account_two_id: account2_m1.account_id });
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('merchant_id, account_one_id, and account_two_id are required');
    });

    it('should return 400 if account_one_id does not exist', async () => {
      const response = await request(app)
        .post(`/api/merchants/${merchant1.merchant_id}/recon-rules`)
        .send({ account_one_id: 'nonexistent_id_jest', account_two_id: account2_m1.account_id });
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Account with ID nonexistent_id_jest not found');
    });

    it('should return 400 if account_two_id does not exist', async () => {
      const response = await request(app)
        .post(`/api/merchants/${merchant1.merchant_id}/recon-rules`)
        .send({ account_one_id: account1_m1.account_id, account_two_id: 'nonexistent_id_jest' });
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Account with ID nonexistent_id_jest not found');
    });

    it('should return 400 if account IDs are the same', async () => {
      const response = await request(app)
        .post(`/api/merchants/${merchant1.merchant_id}/recon-rules`)
        .send({ account_one_id: account1_m1.account_id, account_two_id: account1_m1.account_id });
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Account IDs for a rule must be different');
    });

    it('should return 400 if rule already exists', async () => {
      // Create the rule first directly or via API
      await request(app)
        .post(`/api/merchants/${merchant1.merchant_id}/recon-rules`)
        .send({ account_one_id: account1_m1.account_id, account_two_id: account2_m1.account_id });

      // Attempt to create it again
      const response = await request(app)
        .post(`/api/merchants/${merchant1.merchant_id}/recon-rules`)
        .send({ account_one_id: account1_m1.account_id, account_two_id: account2_m1.account_id });
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('A reconciliation rule with these account IDs already exists.');
    });
  });

  describe('GET /api/merchants/:merchant_id/recon-rules', () => {
    it('should return an empty list if no rules exist', async () => {
      const response = await request(app)
        .get(`/api/merchants/${merchant1.merchant_id}/recon-rules`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return a list of recon rules with account details', async () => {
      await request(app)
        .post(`/api/merchants/${merchant1.merchant_id}/recon-rules`)
        .send({ account_one_id: account1_m1.account_id, account_two_id: account2_m1.account_id });
      await request(app)
        .post(`/api/merchants/${merchant1.merchant_id}/recon-rules`)
        .send({ account_one_id: account2_m1.account_id, account_two_id: account3_m1.account_id });

      const response = await request(app)
        .get(`/api/merchants/${merchant1.merchant_id}/recon-rules`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(2);

      // Check first rule
      const rule1 = response.body.find(r => r.account_one_id === account1_m1.account_id && r.account_two_id === account2_m1.account_id);
      expect(rule1).toBeDefined();
      expect(rule1.accountOne).toBeDefined();
      expect(rule1.accountOne.account_name).toBe(account1_m1.account_name);
      expect(rule1.accountTwo).toBeDefined();
      expect(rule1.accountTwo.account_name).toBe(account2_m1.account_name);

      // Check second rule
      const rule2 = response.body.find(r => r.account_one_id === account2_m1.account_id && r.account_two_id === account3_m1.account_id);
      expect(rule2).toBeDefined();
      expect(rule2.accountOne.account_name).toBe(account2_m1.account_name);
      expect(rule2.accountTwo.account_name).toBe(account3_m1.account_name);
    });
  });

  describe('DELETE /api/merchants/:merchant_id/recon-rules/:rule_id', () => {
    it('should delete a recon rule successfully', async () => {
      // First create a rule
      const createResponse = await request(app)
        .post(`/api/merchants/${merchant1.merchant_id}/recon-rules`)
        .send({ account_one_id: account1_m1.account_id, account_two_id: account2_m1.account_id });

      const ruleId = createResponse.body.id;

      // Then delete it
      const deleteResponse = await request(app)
        .delete(`/api/merchants/${merchant1.merchant_id}/recon-rules/${ruleId}`);

      expect(deleteResponse.statusCode).toBe(200);
      expect(deleteResponse.body.id).toBe(ruleId);

      // Verify 
      const getResponse = await request(app)
        .get(`/api/merchants/${merchant1.merchant_id}/recon-rules`);
      expect(getResponse.body.length).toBe(0);
    });

    it('should return 404 when deleting non-existent rule', async () => {
      const response = await request(app)
        .delete(`/api/merchants/${merchant1.merchant_id}/recon-rules/nonexistent_rule_id`);

      expect(response.statusCode).toBe(404);
      expect(response.body.error).toContain('not found or does not belong to merchant');
    });
  });
});
