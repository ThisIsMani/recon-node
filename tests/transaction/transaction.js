const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/services/prisma');

describe('Transaction API - GET /api/merchants/:merchant_id/transactions', () => {
  let testMerchant;
  let testAccount; // For creating entries
  const transactionsData = [];

  beforeAll(async () => {
    testMerchant = await prisma.merchantAccount.create({
      data: {
        merchant_id: `test_merchant_tx_${Date.now()}`,
        merchant_name: 'Test Merchant for Transactions',
      },
    });

    testAccount = await prisma.account.create({
        data: {
            merchant_id: testMerchant.merchant_id,
            account_name: 'Test Account for Transaction Entries',
            account_type: 'DEBIT_NORMAL',
            currency: 'USD',
        },
    });

    // Create sample transactions with entries
    const tx1LogicalId = `logical_tx_1_${Date.now()}`;
    const tx1 = await prisma.transaction.create({
      data: {
        merchant_id: testMerchant.merchant_id,
        logical_transaction_id: tx1LogicalId,
        status: 'POSTED',
        version: 1,
        entries: {
          create: [
            { account_id: testAccount.account_id, entry_type: 'DEBIT', amount: 100, currency: 'USD', status: 'POSTED', effective_date: new Date() },
            { account_id: testAccount.account_id, entry_type: 'CREDIT', amount: 100, currency: 'USD', status: 'POSTED', effective_date: new Date() },
          ]
        }
      },
      include: { entries: true }
    });
    transactionsData.push(tx1);

    const tx2 = await prisma.transaction.create({
      data: {
        merchant_id: testMerchant.merchant_id,
        logical_transaction_id: `logical_tx_2_${Date.now()}`,
        status: 'EXPECTED',
        version: 1,
        entries: {
            create: [
              { account_id: testAccount.account_id, entry_type: 'DEBIT', amount: 50, currency: 'USD', status: 'EXPECTED', effective_date: new Date() },
            ]
        }
      },
      include: { entries: true }
    });
    transactionsData.push(tx2);

    // Archived version of tx1
    const tx1_v2 = await prisma.transaction.create({
        data: {
          merchant_id: testMerchant.merchant_id,
          logical_transaction_id: tx1LogicalId, // Same logical ID
          status: 'ARCHIVED',
          version: 2, // Incremented version
          discarded_at: new Date(),
          entries: {
            create: [
              { account_id: testAccount.account_id, entry_type: 'DEBIT', amount: 105, currency: 'USD', status: 'POSTED', effective_date: new Date() }, // Corrected amount
              { account_id: testAccount.account_id, entry_type: 'CREDIT', amount: 105, currency: 'USD', status: 'POSTED', effective_date: new Date() },
            ]
          }
        },
        include: { entries: true }
      });
      transactionsData.push(tx1_v2);
  });

  afterAll(async () => {
    // Clean up in reverse order of creation or by specific IDs
    await prisma.entry.deleteMany({ where: { account_id: testAccount.account_id }});
    await prisma.transaction.deleteMany({ where: { merchant_id: testMerchant.merchant_id } });
    await prisma.account.delete({ where: { account_id: testAccount.account_id }});
    await prisma.merchantAccount.delete({ where: { merchant_id: testMerchant.merchant_id } });
    await prisma.$disconnect();
  });

  it('should list all transactions for a valid merchant ID', async () => {
    const response = await request(app).get(`/api/merchants/${testMerchant.merchant_id}/transactions`);
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBe(transactionsData.length);
    response.body.forEach(tx => {
      expect(tx).toHaveProperty('transaction_id');
      expect(tx).toHaveProperty('merchant_id', testMerchant.merchant_id);
      expect(tx).toHaveProperty('status');
      expect(tx).toHaveProperty('entries');
      expect(tx.entries).toBeInstanceOf(Array);
    });
  });

  it('should filter transactions by status=POSTED', async () => {
    const response = await request(app).get(`/api/merchants/${testMerchant.merchant_id}/transactions?status=POSTED`);
    expect(response.statusCode).toBe(200);
    const postedCount = transactionsData.filter(t => t.status === 'POSTED').length;
    expect(response.body.length).toBe(postedCount);
    response.body.forEach(tx => expect(tx.status).toBe('POSTED'));
  });

  it('should filter transactions by logical_transaction_id', async () => {
    const logicalIdToTest = transactionsData[0].logical_transaction_id;
    const response = await request(app).get(`/api/merchants/${testMerchant.merchant_id}/transactions?logical_transaction_id=${logicalIdToTest}`);
    expect(response.statusCode).toBe(200);
    const logicalCount = transactionsData.filter(t => t.logical_transaction_id === logicalIdToTest).length;
    expect(response.body.length).toBe(logicalCount);
    response.body.forEach(tx => expect(tx.logical_transaction_id).toBe(logicalIdToTest));
  });

  it('should filter transactions by version for a specific logical_transaction_id', async () => {
    const logicalIdToTest = transactionsData[0].logical_transaction_id;
    const versionToTest = 1;
    const response = await request(app).get(`/api/merchants/${testMerchant.merchant_id}/transactions?logical_transaction_id=${logicalIdToTest}&version=${versionToTest}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(1);
    expect(response.body[0].logical_transaction_id).toBe(logicalIdToTest);
    expect(response.body[0].version).toBe(versionToTest);
  });

  it('should return 404 if the merchant ID does not exist', async () => {
    const nonExistentMerchantId = 'non-existent-merchant-id-123';
    const response = await request(app).get(`/api/merchants/${nonExistentMerchantId}/transactions`);
    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('error', 'Merchant not found.');
  });
});
