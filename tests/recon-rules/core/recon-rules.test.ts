// Mock prisma first
jest.mock('../../../src/services/prisma');

import { createReconRule, listReconRules, deleteReconRule } from '../../../src/server/core/recon-rules';
import prisma from '../../../src/services/prisma'; // This will now be the mock
import { AccountType, MerchantAccount, Account as PrismaAccount, ReconRule as PrismaReconRuleType } from '@prisma/client';
import { ReconRule } from '../../../src/server/domain_models/recon_rule.types';
import logger from '../../../src/services/logger';

jest.mock('../../../src/services/logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(), query: jest.fn(),
  },
}));

describe('Recon Rules Core Logic', () => {
  let testMerchant: MerchantAccount;
  let account1: PrismaAccount;
  let account2: PrismaAccount;
  let account3: PrismaAccount; 

  beforeAll(async () => {
    // Define test data for mocks
    testMerchant = {
      merchant_id: 'recon-core-merchant',
      merchant_name: 'Recon Core Test Merchant',
      created_at: new Date(),
      updated_at: new Date()
    } as MerchantAccount;
    
    // Mock the responses for the merchantAccount creation
    (prisma.merchantAccount.create as jest.Mock).mockResolvedValueOnce(testMerchant);
    
    // We'll only simulate the create call, but we're really using the predefined testMerchant
    await prisma.merchantAccount.create({
      data: { merchant_id: testMerchant.merchant_id, merchant_name: testMerchant.merchant_name }
    });
    
    account1 = {
      account_id: 'recon-core-account-1',
      merchant_id: testMerchant.merchant_id,
      account_name: 'Recon Core Account 1',
      account_type: AccountType.DEBIT_NORMAL,
      currency: 'USD',
      created_at: new Date(),
      updated_at: new Date()
    } as PrismaAccount;
    
    (prisma.account.create as jest.Mock).mockResolvedValueOnce(account1);
    await prisma.account.create({
      data: {
        merchant_id: testMerchant.merchant_id,
        account_name: 'Recon Core Account 1',
        account_type: AccountType.DEBIT_NORMAL,
        currency: 'USD',
      },
    });
    
    account2 = {
      account_id: 'recon-core-account-2',
      merchant_id: testMerchant.merchant_id,
      account_name: 'Recon Core Account 2',
      account_type: AccountType.CREDIT_NORMAL,
      currency: 'USD',
      created_at: new Date(),
      updated_at: new Date()
    } as PrismaAccount;
    
    (prisma.account.create as jest.Mock).mockResolvedValueOnce(account2);
    await prisma.account.create({
      data: {
        merchant_id: testMerchant.merchant_id,
        account_name: 'Recon Core Account 2',
        account_type: AccountType.CREDIT_NORMAL,
        currency: 'USD',
      },
    });
    
    const otherMerchant = {
      merchant_id: 'other-recon-merchant',
      merchant_name: 'Other Recon Merchant',
      created_at: new Date(),
      updated_at: new Date()
    } as MerchantAccount;
    
    (prisma.merchantAccount.create as jest.Mock).mockResolvedValueOnce(otherMerchant);
    await prisma.merchantAccount.create({
      data: { merchant_id: otherMerchant.merchant_id, merchant_name: otherMerchant.merchant_name }
    });
    
    account3 = {
      account_id: 'other-merchant-account-3',
      merchant_id: otherMerchant.merchant_id,
      account_name: 'Other Merchant Account 3',
      account_type: AccountType.DEBIT_NORMAL,
      currency: 'EUR',
      created_at: new Date(),
      updated_at: new Date()
    } as PrismaAccount;
    
    (prisma.account.create as jest.Mock).mockResolvedValueOnce(account3);
    await prisma.account.create({
      data: {
        merchant_id: otherMerchant.merchant_id,
        account_name: 'Other Merchant Account 3',
        account_type: AccountType.DEBIT_NORMAL,
        currency: 'EUR',
      },
    });
  });

  afterAll(async () => {
    // Use mocked cleanup methods
    (prisma.reconRule.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
    (prisma.account.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
    (prisma.merchantAccount.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
    (prisma.$disconnect as jest.Mock).mockResolvedValueOnce(undefined);
  });

  beforeEach(() => { 
    jest.clearAllMocks(); 
    (logger.error as jest.Mock).mockClear();
    // Mock findUniqueOrThrow for dependent entities to simplify tests
    // These should return the actual objects created in beforeAll
    (prisma.merchantAccount.findUnique as jest.Mock).mockImplementation(async ({ where }: any) => {
      if (where.merchant_id === testMerchant.merchant_id) return testMerchant;
      if (where.merchant_id === 'other-recon-merchant') return { merchant_id: 'other-recon-merchant', merchant_name: 'Other Recon Merchant'}; // Simplified mock
      return null;
    });
    (prisma.account.findUnique as jest.Mock).mockImplementation(async ({ where }: any) => {
      if (where.account_id === account1.account_id) return account1;
      if (where.account_id === account2.account_id) return account2;
      if (where.account_id === account3.account_id) return account3;
      return null;
    });
  });

  describe('createReconRule', () => {
    it('should create a recon rule successfully', async () => {
      const ruleData = { merchant_id: testMerchant.merchant_id, account_one_id: account1.account_id, account_two_id: account2.account_id };
      const mockDate = new Date();
      (prisma.reconRule.create as jest.Mock).mockResolvedValueOnce({
        id: 'test-rule-id',
        merchant_id: ruleData.merchant_id,
        account_one_id: ruleData.account_one_id,
        account_two_id: ruleData.account_two_id,
        created_at: mockDate,
        updated_at: mockDate,
      } as PrismaReconRuleType);

      const rule: ReconRule = await createReconRule(ruleData);
      expect(rule).toBeDefined();
      expect(rule.merchant_id).toBe(testMerchant.merchant_id);
      expect(rule.created_at).toEqual(mockDate);
    });

    it('should throw error if rule already exists (unique constraint)', async () => {
      const ruleData = { merchant_id: testMerchant.merchant_id, account_one_id: account1.account_id, account_two_id: account2.account_id };
      const mockDate = new Date();
      (prisma.reconRule.create as jest.Mock).mockResolvedValueOnce({
        id: 'rule1', ...ruleData, created_at: mockDate, updated_at: mockDate 
      } as PrismaReconRuleType);
      await createReconRule(ruleData); 
      (prisma.reconRule.create as jest.Mock).mockRejectedValueOnce({ code: 'P2002', meta: { target: ['account_one_id', 'account_two_id'] } });
      await expect(createReconRule(ruleData))
        .rejects.toThrow('A reconciliation rule with these account IDs already exists for this merchant.');
    });
    
    // ... other createReconRule tests ...
    it('should throw error if required fields are missing', async () => {
      await expect(createReconRule({ merchant_id: '', account_one_id: account1.account_id, account_two_id: account2.account_id }))
        .rejects.toThrow('merchant_id, account_one_id, and account_two_id are required.');
    });

    it('should throw error if account IDs are the same', async () => {
      const ruleData = { merchant_id: testMerchant.merchant_id, account_one_id: account1.account_id, account_two_id: account1.account_id };
      await expect(createReconRule(ruleData))
        .rejects.toThrow('Account IDs for a rule must be different.');
    });
  });

  describe('listReconRules', () => {
    it('should return an empty array if no rules exist for the merchant', async () => {
      (prisma.reconRule.findMany as jest.Mock).mockResolvedValueOnce([]);
      const rules = await listReconRules(testMerchant.merchant_id);
      expect(rules).toEqual([]);
    });

    it('should list rules for a given merchant', async () => {
      const mockDate = new Date();
      const rule1Data: PrismaReconRuleType = { id: 'rule1', merchant_id: testMerchant.merchant_id, account_one_id: account1.account_id, account_two_id: account2.account_id, created_at: mockDate, updated_at: mockDate };
      (prisma.reconRule.findMany as jest.Mock).mockResolvedValueOnce([rule1Data]);
      const rules = await listReconRules(testMerchant.merchant_id);
      expect(rules.length).toBe(1);
      expect(rules[0].id).toBe('rule1');
    });
  });

  describe('deleteReconRule', () => {
    it('should delete a recon rule successfully', async () => {
      const ruleData = { merchant_id: testMerchant.merchant_id, account_one_id: account1.account_id, account_two_id: account2.account_id };
      const mockDate = new Date();
      const createdRule: PrismaReconRuleType = { id: 'rule-to-delete', ...ruleData, created_at: mockDate, updated_at: mockDate };
      
      // Mock the findUnique call that's used inside findUniqueOrThrow helper
      (prisma.reconRule.findUnique as jest.Mock).mockResolvedValueOnce(createdRule);
      (prisma.reconRule.delete as jest.Mock).mockResolvedValueOnce(createdRule);
      
      const deletedRule = await deleteReconRule(testMerchant.merchant_id, 'rule-to-delete');
      expect(deletedRule).toBeDefined();
      expect(deletedRule.id).toBe('rule-to-delete');
    });

    it('should throw error if rule_id does not exist', async () => { 
      // Mock the findUnique call that's used inside findUniqueOrThrow helper to return null
      (prisma.reconRule.findUnique as jest.Mock).mockResolvedValueOnce(null);
      await expect(deleteReconRule(testMerchant.merchant_id, '999999')) 
        .rejects.toThrow("Recon rule with identifier '999999' not found.");
    });
  });
});
