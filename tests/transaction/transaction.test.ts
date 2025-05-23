import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/services/prisma';
import { 
    MerchantAccount, 
    Account as PrismaAccount, 
    Transaction as PrismaTransaction, 
    Entry as PrismaEntry,
    TransactionStatus, 
    AccountType,
    EntryType, 
    EntryStatus, // Added EntryStatus
    Prisma
} from '@prisma/client';
import { Express } from 'express';

const mockPrismaClient = prisma as any;

describe('Transaction API - GET /api/merchants/:merchant_id/transactions', () => {
  let testMerchant: MerchantAccount;
  let testAccount: PrismaAccount;
  let server: Express;
  const transactionsData: Array<PrismaTransaction & { entries: PrismaEntry[] }> = [];

  beforeAll(async () => {
    server = app;
    testMerchant = await mockPrismaClient.merchantAccount.create({
      data: {
        merchant_id: `test_merchant_tx_${Date.now()}`,
        merchant_name: 'Test Merchant for Transactions',
      },
    });

    testAccount = await mockPrismaClient.account.create({
        data: {
            merchant_id: testMerchant.merchant_id,
            account_name: 'Test Account for Transaction Entries',
            account_type: AccountType.DEBIT_NORMAL,
            currency: 'USD',
        },
    });

    const tx1LogicalId = `logical_tx_1_${Date.now()}`;
    const tx1 = await mockPrismaClient.transaction.create({
      data: {
        merchant_id: testMerchant.merchant_id,
        logical_transaction_id: tx1LogicalId,
        status: TransactionStatus.POSTED,
        version: 1,
        entries: {
          create: [
            { account_id: testAccount.account_id, entry_type: EntryType.DEBIT, amount: new Prisma.Decimal(100), currency: 'USD', status: EntryStatus.POSTED, effective_date: new Date() },
            { account_id: testAccount.account_id, entry_type: EntryType.CREDIT, amount: new Prisma.Decimal(100), currency: 'USD', status: EntryStatus.POSTED, effective_date: new Date() },
          ]
        }
      },
      include: { entries: true }
    });
    transactionsData.push(tx1);

    const tx2 = await mockPrismaClient.transaction.create({
      data: {
        merchant_id: testMerchant.merchant_id,
        logical_transaction_id: `logical_tx_2_${Date.now()}`,
        status: TransactionStatus.EXPECTED,
        version: 1,
        entries: {
            create: [
              { account_id: testAccount.account_id, entry_type: EntryType.DEBIT, amount: new Prisma.Decimal(50), currency: 'USD', status: EntryStatus.EXPECTED, effective_date: new Date() },
            ]
        }
      },
      include: { entries: true }
    });
    transactionsData.push(tx2);

    const tx1_v2 = await mockPrismaClient.transaction.create({
        data: {
          merchant_id: testMerchant.merchant_id,
          logical_transaction_id: tx1LogicalId, 
          status: TransactionStatus.ARCHIVED,
          version: 2, 
          discarded_at: new Date(),
          entries: {
            create: [
              { account_id: testAccount.account_id, entry_type: EntryType.DEBIT, amount: new Prisma.Decimal(105), currency: 'USD', status: EntryStatus.POSTED, effective_date: new Date() }, 
              { account_id: testAccount.account_id, entry_type: EntryType.CREDIT, amount: new Prisma.Decimal(105), currency: 'USD', status: EntryStatus.POSTED, effective_date: new Date() },
            ]
          }
        },
        include: { entries: true }
      });
      transactionsData.push(tx1_v2);
  });

  afterAll(async () => {
    await mockPrismaClient.entry.deleteMany({ where: { account_id: testAccount.account_id }});
    await mockPrismaClient.transaction.deleteMany({ where: { merchant_id: testMerchant.merchant_id } });
    if (testAccount) { // Ensure testAccount exists before trying to delete
        await mockPrismaClient.account.delete({ where: { account_id: testAccount.account_id }});
    }
    if (testMerchant) { // Ensure testMerchant exists
        await mockPrismaClient.merchantAccount.delete({ where: { merchant_id: testMerchant.merchant_id } });
    }
    await mockPrismaClient.$disconnect();
  });

  it('should list all transactions for a valid merchant ID', async () => {
    const response = await request(server).get(`/api/merchants/${testMerchant.merchant_id}/transactions`);
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBe(transactionsData.length);
    response.body.forEach((tx: any) => { // Use any for now, or import TransactionResponse
      expect(tx).toHaveProperty('transaction_id');
      expect(tx).toHaveProperty('merchant_id', testMerchant.merchant_id);
      expect(tx).toHaveProperty('status');
      expect(tx).toHaveProperty('created_at');
      expect(tx).toHaveProperty('updated_at');
      // The TransactionResponse DTO does not include 'entries' by default.
      // expect(tx).toHaveProperty('entries'); 
      // expect(tx.entries).toBeInstanceOf(Array);
      if (tx.discarded_at) {
        expect(new Date(tx.discarded_at).toISOString()).toBe(tx.discarded_at);
      }
      expect(new Date(tx.created_at).toISOString()).toBe(tx.created_at);
      expect(new Date(tx.updated_at).toISOString()).toBe(tx.updated_at);
    });
  });

  it('should filter transactions by status=POSTED', async () => {
    const response = await request(server).get(`/api/merchants/${testMerchant.merchant_id}/transactions?status=POSTED`);
    expect(response.statusCode).toBe(200);
    const postedCount = transactionsData.filter(t => t.status === 'POSTED').length;
    expect(response.body.length).toBe(postedCount);
    response.body.forEach((tx: any) => expect(tx.status).toBe('POSTED'));
  });

  it('should filter transactions by logical_transaction_id', async () => {
    const logicalIdToTest = transactionsData[0].logical_transaction_id;
    const response = await request(server).get(`/api/merchants/${testMerchant.merchant_id}/transactions?logical_transaction_id=${logicalIdToTest}`);
    expect(response.statusCode).toBe(200);
    const logicalCount = transactionsData.filter(t => t.logical_transaction_id === logicalIdToTest).length;
    expect(response.body.length).toBe(logicalCount);
    response.body.forEach((tx: any) => expect(tx.logical_transaction_id).toBe(logicalIdToTest));
  });

  it('should filter transactions by version for a specific logical_transaction_id', async () => {
    const logicalIdToTest = transactionsData[0].logical_transaction_id;
    const versionToTest = 1;
    const response = await request(server).get(`/api/merchants/${testMerchant.merchant_id}/transactions?logical_transaction_id=${logicalIdToTest}&version=${versionToTest}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(1);
    expect(response.body[0].logical_transaction_id).toBe(logicalIdToTest);
    expect(response.body[0].version).toBe(versionToTest);
  });

  it('should return 404 if the merchant ID does not exist', async () => {
    const nonExistentMerchantId = 'non-existent-merchant-id-123';
    const response = await request(server).get(`/api/merchants/${nonExistentMerchantId}/transactions`);
    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('error', 'Merchant not found.');
  });
});
