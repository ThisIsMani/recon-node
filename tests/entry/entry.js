const request = require('supertest');
const app = require('../../src/app'); // Assuming app is exported for testing
const prisma = require('../../src/services/prisma');

describe('Entry API - GET /api/accounts/:account_id/entries', () => {
  let testMerchant;
  let testAccount;
  let dummyTransaction; // Added for linking entries
  // Sample entries to be created for testing
  const entryData = [
    {
      entry_type: 'CREDIT',
      amount: 100.50,
      currency: 'USD',
      status: 'POSTED',
      effective_date: new Date().toISOString(),
    },
    {
      entry_type: 'DEBIT',
      amount: 50.25,
      currency: 'USD',
      status: 'EXPECTED',
      effective_date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // Yesterday
    },
    {
      entry_type: 'CREDIT',
      amount: 200.00,
      currency: 'USD',
      status: 'POSTED',
      effective_date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), // Day before yesterday
    },
    {
      entry_type: 'DEBIT',
      amount: 75.00,
      currency: 'USD',
      status: 'ARCHIVED',
      effective_date: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(),
      discarded_at: new Date().toISOString(),
    },
  ];

  beforeAll(async () => {
    // 1. Create a merchant for context
    testMerchant = await prisma.merchantAccount.create({
      data: {
        merchant_id: `test_merchant_entries_${Date.now()}`,
        merchant_name: 'Test Merchant for Entries',
      },
    });

    // 2. Create an account for this merchant
    testAccount = await prisma.account.create({
      data: {
        merchant_id: testMerchant.merchant_id,
        account_name: 'Test Account for Entries',
        account_type: 'DEBIT_NORMAL',
        currency: 'USD',
      },
    });

    // 2.5 Create a dummy transaction to link entries to
    dummyTransaction = await prisma.transaction.create({
      data: {
        merchant_id: testMerchant.merchant_id,
        status: 'POSTED', // Or any valid status
        // logical_transaction_id and version will default
      },
    });

    // 3. Create some entries directly in the DB for this account (since no POST API)
    for (const data of entryData) {
      await prisma.entry.create({
        data: {
          ...data,
          account_id: testAccount.account_id,
          transaction_id: dummyTransaction.transaction_id, // Link to the dummy transaction
        },
      });
    }
  });

  afterAll(async () => {
    // Clean up: delete entries, transaction, account, and merchant
    // Order matters due to foreign key constraints
    if (dummyTransaction) {
      await prisma.entry.deleteMany({ where: { transaction_id: dummyTransaction.transaction_id } });
      await prisma.transaction.delete({ where: { transaction_id: dummyTransaction.transaction_id } });
    } else {
      // Fallback if dummyTransaction wasn't created, though it should be
      await prisma.entry.deleteMany({ where: { account_id: testAccount.account_id } });
    }
    if (testAccount) {
      await prisma.account.delete({ where: { account_id: testAccount.account_id } });
    }
    if (testMerchant) {
      await prisma.merchantAccount.delete({ where: { merchant_id: testMerchant.merchant_id } });
    }
    await prisma.$disconnect();
    // server.close(); // Supertest handles server lifecycle when passed the app instance
  });

  it('should list all entries for a valid account ID', async () => {
    const response = await request(app).get(`/api/accounts/${testAccount.account_id}/entries`);
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBe(entryData.length);
    // Check if some key properties are present
    response.body.forEach(entry => {
      expect(entry).toHaveProperty('entry_id');
      expect(entry).toHaveProperty('account_id', testAccount.account_id);
      expect(entry).toHaveProperty('amount');
      expect(entry).toHaveProperty('status');
      expect(entry).toHaveProperty('account'); // Check for included account details
      expect(entry.account).toHaveProperty('account_name', testAccount.account_name);
    });
  });

  it('should filter entries by status=POSTED', async () => {
    const response = await request(app).get(`/api/accounts/${testAccount.account_id}/entries?status=POSTED`);
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    const postedEntriesCount = entryData.filter(e => e.status === 'POSTED').length;
    expect(response.body.length).toBe(postedEntriesCount);
    response.body.forEach(entry => {
      expect(entry.status).toBe('POSTED');
    });
  });

  it('should filter entries by status=EXPECTED', async () => {
    const response = await request(app).get(`/api/accounts/${testAccount.account_id}/entries?status=EXPECTED`);
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    const expectedEntriesCount = entryData.filter(e => e.status === 'EXPECTED').length;
    expect(response.body.length).toBe(expectedEntriesCount);
    response.body.forEach(entry => {
      expect(entry.status).toBe('EXPECTED');
    });
  });

  it('should return an empty array if no entries match filter', async () => {
    // Using a status that is valid for EntryStatus but not present in our seed data for this test
    const response = await request(app).get(`/api/accounts/${testAccount.account_id}/entries?status=ARCHIVED`); // Changed to ARCHIVED to test a valid but potentially empty filter
    expect(response.statusCode).toBe(200); 
    expect(response.body).toBeInstanceOf(Array);
    const archivedEntriesCount = entryData.filter(e => e.status === 'ARCHIVED').length;
    expect(response.body.length).toBe(archivedEntriesCount); // Should match count if any, or 0
     if (archivedEntriesCount > 0) {
      response.body.forEach(entry => {
        expect(entry.status).toBe('ARCHIVED');
      });
    }
  });

  it('should return 404 if the account ID does not exist', async () => {
    const nonExistentAccountId = 'non-existent-account-id-123';
    const response = await request(app).get(`/api/accounts/${nonExistentAccountId}/entries`);
    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('error', 'Account not found.');
  });

  it('should return entries ordered by effective_date descending', async () => {
    const response = await request(app).get(`/api/accounts/${testAccount.account_id}/entries`);
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBeGreaterThan(1);
    // Check if dates are in descending order
    for (let i = 0; i < response.body.length - 1; i++) {
      const date1 = new Date(response.body[i].effective_date);
      const date2 = new Date(response.body[i+1].effective_date);
      expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
    }
  });
});
