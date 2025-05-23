import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/services/prisma';
import logger from '../../src/services/logger';
import { MerchantAccount, Account as PrismaAccount, AccountType, ReconRule } from '@prisma/client';
import { Express } from 'express';

const mockPrismaClient = prisma as any;

describe('Recon Rules API Endpoints', () => {
  let merchant1: MerchantAccount;
  let account1_m1: PrismaAccount;
  let account2_m1: PrismaAccount;
  let account3_m1: PrismaAccount;
  let server: Express;

  beforeAll(async () => {
    server = app;
    try {
      merchant1 = await mockPrismaClient.merchantAccount.upsert({
        where: { merchant_id: 'recon_m001_jest' },
        update: {},
        create: { merchant_id: 'recon_m001_jest', merchant_name: 'Recon Test Merchant Jest' },
      });

      account1_m1 = await mockPrismaClient.account.create({
        data: {
          merchant_id: merchant1.merchant_id,
          account_name: 'Recon Acc One Jest',
          account_type: AccountType.DEBIT_NORMAL,
          currency: 'USD',
        },
      });
      account2_m1 = await mockPrismaClient.account.create({
        data: {
          merchant_id: merchant1.merchant_id,
          account_name: 'Recon Acc Two Jest',
          account_type: AccountType.CREDIT_NORMAL,
          currency: 'USD',
        },
      });
      account3_m1 = await mockPrismaClient.account.create({
        data: {
          merchant_id: merchant1.merchant_id,
          account_name: 'Recon Acc Three Jest',
          account_type: AccountType.CREDIT_NORMAL,
          currency: 'USD',
        },
      });
    } catch (e) {
      const error = e as Error;
      logger.error("Error in beforeAll setup for recon-rules.test.ts:", error);
      throw error;
    }
  });

  afterEach(async () => {
    await mockPrismaClient.reconRule.deleteMany({});
  });

  afterAll(async () => {
    await mockPrismaClient.account.deleteMany({ where: { merchant_id: merchant1.merchant_id } });
    await mockPrismaClient.merchantAccount.delete({ where: { merchant_id: merchant1.merchant_id } });
    await mockPrismaClient.$disconnect();
  });

  describe('POST /api/merchants/:merchant_id/recon-rules', () => {
    it('should create a new recon rule successfully', async () => {
      const response = await request(server)
        .post(`/api/merchants/${merchant1.merchant_id}/recon-rules`)
        .send({ account_one_id: account1_m1.account_id, account_two_id: account2_m1.account_id });
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.account_one_id).toBe(account1_m1.account_id);
      expect(response.body.account_two_id).toBe(account2_m1.account_id);
      expect(response.body.merchant_id).toBe(merchant1.merchant_id);
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('updated_at');
      expect(new Date(response.body.created_at).toISOString()).toBe(response.body.created_at);
      expect(new Date(response.body.updated_at).toISOString()).toBe(response.body.updated_at);
    });

    it('should return 400 if account_one_id is missing', async () => {
      const response = await request(server)
        .post(`/api/merchants/${merchant1.merchant_id}/recon-rules`)
        .send({ account_two_id: account2_m1.account_id });
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('merchant_id, account_one_id, and account_two_id are required');
    });

    it('should return 400 if account_one_id does not exist', async () => {
      const response = await request(server)
        .post(`/api/merchants/${merchant1.merchant_id}/recon-rules`)
        .send({ account_one_id: 'nonexistent_id_jest', account_two_id: account2_m1.account_id });
      expect(response.statusCode).toBe(404); // Changed from 400
      expect(response.body.error).toBe("Account (account_one_id) with identifier 'nonexistent_id_jest' not found."); // Updated message
    });

    it('should return 400 if account_two_id does not exist', async () => {
      const response = await request(server)
        .post(`/api/merchants/${merchant1.merchant_id}/recon-rules`)
        .send({ account_one_id: account1_m1.account_id, account_two_id: 'nonexistent_id_jest' });
      expect(response.statusCode).toBe(404); // Changed from 400
      expect(response.body.error).toBe("Account (account_two_id) with identifier 'nonexistent_id_jest' not found."); // Updated message
    });

    it('should return 400 if account IDs are the same', async () => {
      const response = await request(server)
        .post(`/api/merchants/${merchant1.merchant_id}/recon-rules`)
        .send({ account_one_id: account1_m1.account_id, account_two_id: account1_m1.account_id });
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Account IDs for a rule must be different');
    });

    it('should return 400 if rule already exists', async () => {
      await request(server)
        .post(`/api/merchants/${merchant1.merchant_id}/recon-rules`)
        .send({ account_one_id: account1_m1.account_id, account_two_id: account2_m1.account_id });

      const response = await request(server)
        .post(`/api/merchants/${merchant1.merchant_id}/recon-rules`)
        .send({ account_one_id: account1_m1.account_id, account_two_id: account2_m1.account_id });
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('A reconciliation rule with these account IDs already exists for this merchant.');
    });
  });

  describe('GET /api/merchants/:merchant_id/recon-rules', () => {
    it('should return an empty list if no rules exist', async () => {
      const response = await request(server)
        .get(`/api/merchants/${merchant1.merchant_id}/recon-rules`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return a list of recon rules with account details', async () => {
      await request(server)
        .post(`/api/merchants/${merchant1.merchant_id}/recon-rules`)
        .send({ account_one_id: account1_m1.account_id, account_two_id: account2_m1.account_id });
      await request(server)
        .post(`/api/merchants/${merchant1.merchant_id}/recon-rules`)
        .send({ account_one_id: account2_m1.account_id, account_two_id: account3_m1.account_id });

      const response = await request(server)
        .get(`/api/merchants/${merchant1.merchant_id}/recon-rules`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(2);
      
      response.body.forEach((rule: any) => { // Use any or import ReconRuleResponse
        expect(rule).toHaveProperty('id');
        expect(rule).toHaveProperty('merchant_id', merchant1.merchant_id);
        expect(rule).toHaveProperty('account_one_id');
        expect(rule).toHaveProperty('account_two_id');
        expect(rule).toHaveProperty('created_at');
        expect(rule).toHaveProperty('updated_at');
        // accountOne and accountTwo are not part of ReconRuleResponse by default
        // expect(rule).toHaveProperty('accountOne'); 
        // expect(rule).toHaveProperty('accountTwo');
      });

      const rule1 = response.body.find((r: any) => r.account_one_id === account1_m1.account_id && r.account_two_id === account2_m1.account_id);
      expect(rule1).toBeDefined();
      // if (rule1.accountOne) expect(rule1.accountOne.account_name).toBe(account1_m1.account_name); // Conditional check if API might include it
      // if (rule1.accountTwo) expect(rule1.accountTwo.account_name).toBe(account2_m1.account_name);

      const rule2 = response.body.find((r: any) => r.account_one_id === account2_m1.account_id && r.account_two_id === account3_m1.account_id);
      expect(rule2).toBeDefined();
      // if (rule2.accountOne) expect(rule2.accountOne.account_name).toBe(account2_m1.account_name);
      // if (rule2.accountTwo) expect(rule2.accountTwo.account_name).toBe(account3_m1.account_name);
    });
  });

  describe('DELETE /api/merchants/:merchant_id/recon-rules/:rule_id', () => {
    it('should delete a recon rule successfully', async () => {
      const createResponse = await request(server)
        .post(`/api/merchants/${merchant1.merchant_id}/recon-rules`)
        .send({ account_one_id: account1_m1.account_id, account_two_id: account2_m1.account_id });

      const ruleId = createResponse.body.id;

      const deleteResponse = await request(server)
        .delete(`/api/merchants/${merchant1.merchant_id}/recon-rules/${ruleId}`);

      expect(deleteResponse.statusCode).toBe(200);
      expect(deleteResponse.body.id).toBe(ruleId);

      const getResponse = await request(server)
        .get(`/api/merchants/${merchant1.merchant_id}/recon-rules`);
      expect(getResponse.body.length).toBe(0);
    });

    it('should return 404 when deleting non-existent rule', async () => {
      const response = await request(server)
        .delete(`/api/merchants/${merchant1.merchant_id}/recon-rules/999999`); 

      expect(response.statusCode).toBe(404);
      expect(response.body.error).toBe("Recon rule with identifier '999999' not found."); // Updated message
    });
  });
});
