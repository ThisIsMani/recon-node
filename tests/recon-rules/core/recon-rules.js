const { createReconRule, listReconRules, deleteReconRule } = require('../../../src/server/core/recon-rules/index');
const prisma = require('../../../src/services/prisma');
const { AccountType } = require('@prisma/client');

describe('Recon Rules Core Logic', () => {
  let testMerchant;
  let account1;
  let account2;
  let account3; // For testing rules with different merchants or non-existent accounts

  let consoleErrorSpy;

  beforeAll(async () => {
    // consoleErrorSpy is initialized in beforeEach
    testMerchant = await prisma.merchantAccount.create({
      data: { merchant_id: 'recon-core-merchant', merchant_name: 'Recon Core Test Merchant' },
    });
    account1 = await prisma.account.create({
      data: {
        merchant_id: testMerchant.merchant_id,
        account_name: 'Recon Core Account 1',
        account_type: AccountType.DEBIT_NORMAL,
        currency: 'USD',
      },
    });
    account2 = await prisma.account.create({
      data: {
        merchant_id: testMerchant.merchant_id,
        account_name: 'Recon Core Account 2',
        account_type: AccountType.CREDIT_NORMAL,
        currency: 'USD',
      },
    });
    // Account for a different merchant (or to simulate non-existence for a specific merchant)
    const otherMerchant = await prisma.merchantAccount.create({
        data: { merchant_id: 'other-recon-merchant', merchant_name: 'Other Recon Merchant'},
    });
    account3 = await prisma.account.create({
        data: {
            merchant_id: otherMerchant.merchant_id,
            account_name: 'Other Merchant Account 3',
            account_type: AccountType.DEBIT_NORMAL,
            currency: 'EUR',
        },
    });
  });

  afterAll(async () => {
    await prisma.reconRule.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.merchantAccount.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.reconRule.deleteMany({});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore the original console.error and any other mocks
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('createReconRule', () => {
    it('should create a recon rule successfully', async () => {
      const ruleData = { merchant_id: testMerchant.merchant_id, account_one_id: account1.account_id, account_two_id: account2.account_id };
      const rule = await createReconRule(ruleData);
      expect(rule).toBeDefined();
      expect(rule.merchant_id).toBe(testMerchant.merchant_id);
      expect(rule.account_one_id).toBe(account1.account_id);
      expect(rule.account_two_id).toBe(account2.account_id);
    });

    it('should throw error if required fields are missing', async () => {
      await expect(createReconRule({ account_one_id: account1.account_id, account_two_id: account2.account_id }))
        .rejects.toThrow('merchant_id, account_one_id, and account_two_id are required.');
    });

    it('should throw error if account IDs are the same', async () => {
      const ruleData = { merchant_id: testMerchant.merchant_id, account_one_id: account1.account_id, account_two_id: account1.account_id };
      await expect(createReconRule(ruleData))
        .rejects.toThrow('Account IDs for a rule must be different.');
    });

    it('should throw error if merchant does not exist', async () => {
      const ruleData = { merchant_id: 'non-existent-merchant', account_one_id: account1.account_id, account_two_id: account2.account_id };
      await expect(createReconRule(ruleData))
        .rejects.toThrow('Merchant with ID non-existent-merchant not found.');
    });
    
    it('should throw error if account_one_id does not exist for the merchant', async () => {
        const ruleData = { merchant_id: testMerchant.merchant_id, account_one_id: 'non-existent-acc', account_two_id: account2.account_id };
        await expect(createReconRule(ruleData))
          .rejects.toThrow(`Account with ID non-existent-acc not found.`);
      });
  
    it('should throw error if account_two_id does not exist', async () => {
    const ruleData = { merchant_id: testMerchant.merchant_id, account_one_id: account1.account_id, account_two_id: 'non-existent-acc-2' };
    await expect(createReconRule(ruleData))
        .rejects.toThrow(`Account with ID non-existent-acc-2 not found or does not belong to merchant ${testMerchant.merchant_id}.`);
    });


    it('should throw error if rule already exists (unique constraint)', async () => {
      const ruleData = { merchant_id: testMerchant.merchant_id, account_one_id: account1.account_id, account_two_id: account2.account_id };
      await createReconRule(ruleData); // Create first rule
      await expect(createReconRule(ruleData)) // Attempt to create duplicate
        .rejects.toThrow('A reconciliation rule with these account IDs already exists.');
    });

    it('should throw a generic error for other database issues during creation', async () => {
      jest.spyOn(prisma.reconRule, 'create').mockRejectedValueOnce(new Error('Some other DB error'));
      const ruleData = { merchant_id: testMerchant.merchant_id, account_one_id: account1.account_id, account_two_id: account2.account_id };
       // To avoid hitting other validation errors first, ensure data is valid up to the mock
      jest.spyOn(prisma.merchantAccount, 'findUnique').mockResolvedValueOnce(testMerchant);
      jest.spyOn(prisma.account, 'findUnique')
        .mockResolvedValueOnce(account1) // For accountOne
        .mockResolvedValueOnce(account2); // For accountTwo

      await expect(createReconRule(ruleData))
        .rejects.toThrow('Could not create recon rule.');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error creating recon rule:', expect.any(Error));
      // jest.restoreAllMocks(); // Handled by afterEach
    });
  });

  describe('listReconRules', () => {
    it('should return an empty array if no rules exist for the merchant', async () => {
      const rules = await listReconRules(testMerchant.merchant_id);
      expect(rules).toEqual([]);
    });

    it('should list rules for a given merchant', async () => {
      const ruleData = { merchant_id: testMerchant.merchant_id, account_one_id: account1.account_id, account_two_id: account2.account_id };
      await createReconRule(ruleData);
      const rules = await listReconRules(testMerchant.merchant_id);
      expect(rules.length).toBe(1);
      expect(rules[0].account_one_id).toBe(account1.account_id);
    });

    it('should throw an error for database issues during listing', async () => {
      jest.spyOn(prisma.reconRule, 'findMany').mockRejectedValueOnce(new Error('DB list error'));
      await expect(listReconRules(testMerchant.merchant_id))
        .rejects.toThrow('Could not list recon rules.');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error listing recon rules:', expect.any(Error));
      // jest.restoreAllMocks(); // Handled by afterEach
    });
  });

  describe('deleteReconRule', () => {
    it('should delete a recon rule successfully', async () => {
      const ruleData = { merchant_id: testMerchant.merchant_id, account_one_id: account1.account_id, account_two_id: account2.account_id };
      const rule = await createReconRule(ruleData);
      
      const deletedRule = await deleteReconRule(testMerchant.merchant_id, rule.id);
      expect(deletedRule).toBeDefined();
      expect(deletedRule.id).toBe(rule.id);

      const foundRule = await prisma.reconRule.findUnique({ where: { id: rule.id } });
      expect(foundRule).toBeNull();
    });

    it('should throw error if rule_id does not exist', async () => {
      await expect(deleteReconRule(testMerchant.merchant_id, 'non-existent-rule-id'))
        .rejects.toThrow('Recon rule with ID non-existent-rule-id not found or does not belong to merchant recon-core-merchant.');
    });
    
    it('should throw error if rule belongs to a different merchant', async () => {
        const ruleData = { merchant_id: testMerchant.merchant_id, account_one_id: account1.account_id, account_two_id: account2.account_id };
        const rule = await createReconRule(ruleData);
        
        await expect(deleteReconRule('another-merchant-id', rule.id))
          .rejects.toThrow(`Recon rule with ID ${rule.id} not found or does not belong to merchant another-merchant-id.`);
      });

    it('should throw a generic error for other database issues during deletion', async () => {
      const ruleData = { merchant_id: testMerchant.merchant_id, account_one_id: account1.account_id, account_two_id: account2.account_id };
      const rule = await createReconRule(ruleData);
      jest.spyOn(prisma.reconRule, 'delete').mockRejectedValueOnce(new Error('Some other DB error'));
      
      await expect(deleteReconRule(testMerchant.merchant_id, rule.id))
        .rejects.toThrow('Could not delete recon rule.');
      // console.error is called in the catch block of deleteReconRule if NODE_ENV !== 'test'
      // For this test, we are interested in the thrown error.
      // jest.restoreAllMocks(); // Handled by afterEach
    });
  });
});
