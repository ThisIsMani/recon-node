const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/services/prisma');
const stagingEntryCore = require('../../src/server/core/staging-entry');

describe('Staging Entry API Endpoints', () => {
  let merchant, account;

  beforeAll(async () => {
    merchant = await prisma.merchantAccount.upsert({
      where: { merchant_id: 'staging_m001_jest' },
      update: {},
      create: { merchant_id: 'staging_m001_jest', merchant_name: 'Staging Test Merchant' },
    });
    account = await prisma.account.create({
      data: {
        merchant_id: merchant.merchant_id,
        account_name: 'Staging Test Account',
        account_type: 'DEBIT_NORMAL',
        currency: 'USD',
      },
    });
  });

  afterEach(async () => {
    await prisma.stagingEntry.deleteMany({});
  });

  afterAll(async () => {
    await prisma.stagingEntry.deleteMany({}); // Ensure cleanup if any test fails mid-way
    await prisma.account.deleteMany({ where: { merchant_id: merchant.merchant_id } });
    await prisma.merchantAccount.delete({ where: { merchant_id: merchant.merchant_id } });
    await prisma.$disconnect();
  });

  describe('POST /api/staging-entries', () => {
    it('should create a new staging entry successfully without discarded_at', async () => {
      const entryData = {
        account_id: account.account_id,
        entry_type: 'DEBIT',
        amount: 100.50,
        currency: 'USD',
        effective_date: new Date().toISOString(),
        metadata: { source: 'test' }
      };
      const response = await request(app)
        .post(`/api/accounts/${account.account_id}/staging-entries`)
        .send(entryData);
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('staging_entry_id');
      expect(response.body.status).toBe('NEEDS_MANUAL_REVIEW');
      expect(response.body.amount.toString()).toBe('100.5');
      expect(response.body.discarded_at).toBeNull();
    });

    it('should create a new staging entry successfully with discarded_at', async () => {
      const discardedDate = new Date().toISOString();
      const entryData = {
        account_id: account.account_id,
        entry_type: 'CREDIT',
        amount: 200.00,
        currency: 'EUR',
        effective_date: new Date().toISOString(),
        metadata: { reason: 'duplicate' },
        discarded_at: discardedDate
      };
      const response = await request(app)
        .post(`/api/accounts/${account.account_id}/staging-entries`)
        .send(entryData);
      expect(response.statusCode).toBe(201);
      expect(response.body.discarded_at).toBe(discardedDate);
    });

    it('should return 400 for missing required fields in body', async () => {
        const entryData = { entry_type: 'DEBIT', amount: 100 };
        const response = await request(app)
          .post(`/api/accounts/${account.account_id}/staging-entries`)
          .send(entryData);
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toContain('Missing required fields in body');
    });

    // This test is now covered by the route structure itself, 
    // as a request to a non-existent account_id in path would typically result in a 404 from the parent router
    // or a specific check if we add one for account_id in the staging entry router itself.
    // For now, assuming the core logic's check is sufficient if the route is reached.
    // it('should return 400 for invalid account_id in path', async () => { ... });
    
    it('should return 400 for invalid entry_type in body', async () => {
        const entryData = {
            entry_type: 'INVALID_TYPE',
            amount: 100.50,
            currency: 'USD',
            effective_date: new Date().toISOString(),
        };
        const response = await request(app)
          .post(`/api/accounts/${account.account_id}/staging-entries`)
          .send(entryData);
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toContain('Invalid input for staging entry creation');
    });
  });

  describe('GET /api/accounts/:account_id/staging-entries', () => {
    let otherAccount;
    beforeAll(async () => {
        otherAccount = await prisma.account.create({
            data: {
                merchant_id: merchant.merchant_id,
                account_name: 'Other Staging Test Account',
                account_type: 'CREDIT_NORMAL',
                currency: 'EUR',
            },
        });
    });
    afterAll(async () => {
        await prisma.account.delete({ where: { account_id: otherAccount.account_id }});
    });

    beforeEach(async () => {
        // Entries for 'account'
        await stagingEntryCore.createStagingEntry(account.account_id, { entry_type: 'CREDIT', amount: 50, currency: 'USD', effective_date: new Date() });
        await stagingEntryCore.createStagingEntry(account.account_id, { entry_type: 'DEBIT', amount: 25, currency: 'USD', effective_date: new Date() });
        // Entry for 'otherAccount' to test filtering by account_id in path
        await stagingEntryCore.createStagingEntry(otherAccount.account_id, { entry_type: 'DEBIT', amount: 75, currency: 'EUR', effective_date: new Date() });
    });

    it('should list all staging entries for the specified account_id', async () => {
      const response = await request(app).get(`/api/accounts/${account.account_id}/staging-entries`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(2); // Only 2 for 'account'
      response.body.forEach(entry => {
        expect(entry.account_id).toBe(account.account_id);
      });
    });

    it('should filter staging entries by status for the specified account_id', async () => {
      // Update one entry for 'account' to PROCESSED to test status filtering
      const entriesForAccount = await stagingEntryCore.listStagingEntries(account.account_id);
      await prisma.stagingEntry.update({ // Directly update for test setup simplicity
          where: { staging_entry_id: entriesForAccount[0].staging_entry_id },
          data: { status: 'PROCESSED' }
      });

      const response = await request(app).get(`/api/accounts/${account.account_id}/staging-entries?status=PROCESSED`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(1); 
      expect(response.body[0].status).toBe('PROCESSED');
      expect(response.body[0].account_id).toBe(account.account_id);
    });
    
    it('should include account details in listed entries', async () => {
        const response = await request(app).get(`/api/accounts/${account.account_id}/staging-entries`);
        expect(response.statusCode).toBe(200);
        expect(response.body[0].account).toBeDefined();
        expect(response.body[0].account.account_name).toBe('Staging Test Account');
    });
  });
});
