import request from 'supertest';
import app from '../../src/app'; 
import prisma from '../../src/services/prisma';
import { EntryStatus, EntryType, AccountType, TransactionStatus, MerchantAccount, Account as PrismaAccount, Transaction as PrismaTransaction, Entry as PrismaEntry, Prisma } from '@prisma/client';
import { Express } from 'express';

const mockPrismaClient = prisma as any;

describe('Entry API - GET /api/accounts/:account_id/entries', () => {
  let testMerchant: MerchantAccount;
  let testAccount: PrismaAccount;
  let dummyTransaction: PrismaTransaction;
  let server: Express;

  interface EntrySeedData {
    entry_type: EntryType;
    amount: number; // Using number for seed data, will convert to Decimal for Prisma
    currency: string;
    status: EntryStatus;
    effective_date: string;
    discarded_at?: string;
  }

  const entryData: EntrySeedData[] = [
    {
      entry_type: EntryType.CREDIT,
      amount: 100.50,
      currency: 'USD',
      status: EntryStatus.POSTED,
      effective_date: new Date().toISOString(),
    },
    {
      entry_type: EntryType.DEBIT,
      amount: 50.25,
      currency: 'USD',
      status: EntryStatus.EXPECTED,
      effective_date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
    },
    {
      entry_type: EntryType.CREDIT,
      amount: 200.00,
      currency: 'USD',
      status: EntryStatus.POSTED,
      effective_date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
    },
    {
      entry_type: EntryType.DEBIT,
      amount: 75.00,
      currency: 'USD',
      status: EntryStatus.ARCHIVED,
      effective_date: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(),
      discarded_at: new Date().toISOString(),
    },
  ];

  beforeAll(async () => {
    server = app;
    testMerchant = await mockPrismaClient.merchantAccount.create({
      data: {
        merchant_id: `test_merchant_entries_${Date.now()}`,
        merchant_name: 'Test Merchant for Entries',
      },
    });

    testAccount = await mockPrismaClient.account.create({
      data: {
        merchant_id: testMerchant.merchant_id,
        account_name: 'Test Account for Entries',
        account_type: AccountType.DEBIT_NORMAL,
        currency: 'USD',
      },
    });

    dummyTransaction = await mockPrismaClient.transaction.create({
      data: {
        merchant_id: testMerchant.merchant_id,
        status: TransactionStatus.POSTED,
      },
    });

    for (const data of entryData) {
      await mockPrismaClient.entry.create({
        data: {
          ...data,
          amount: new Prisma.Decimal(data.amount.toString()),
          account_id: testAccount.account_id,
          transaction_id: dummyTransaction.transaction_id,
          effective_date: new Date(data.effective_date), // Ensure it's a Date object
          discarded_at: data.discarded_at ? new Date(data.discarded_at) : null,
        },
      });
    }
  });

  afterAll(async () => {
    if (dummyTransaction) {
      await mockPrismaClient.entry.deleteMany({ where: { transaction_id: dummyTransaction.transaction_id } });
      await mockPrismaClient.transaction.delete({ where: { transaction_id: dummyTransaction.transaction_id } });
    } else if (testAccount) { // Fallback if dummyTransaction wasn't created
      await mockPrismaClient.entry.deleteMany({ where: { account_id: testAccount.account_id } });
    }
    if (testAccount) {
      await mockPrismaClient.account.delete({ where: { account_id: testAccount.account_id } });
    }
    if (testMerchant) {
      await mockPrismaClient.merchantAccount.delete({ where: { merchant_id: testMerchant.merchant_id } });
    }
    await mockPrismaClient.$disconnect();
  });

  it('should list all entries for a valid account ID', async () => {
    const response = await request(server).get(`/api/accounts/${testAccount.account_id}/entries`);
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBe(entryData.length);
    response.body.forEach((entry: PrismaEntry & { account: any }) => { // Add type for entry
      expect(entry).toHaveProperty('entry_id');
      expect(entry).toHaveProperty('account_id', testAccount.account_id);
      expect(entry).toHaveProperty('amount');
      expect(entry).toHaveProperty('status');
      expect(entry).toHaveProperty('account');
      expect(entry.account).toHaveProperty('account_name', testAccount.account_name);
    });
  });

  it('should filter entries by status=POSTED', async () => {
    const response = await request(server).get(`/api/accounts/${testAccount.account_id}/entries?status=POSTED`);
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    const postedEntriesCount = entryData.filter(e => e.status === 'POSTED').length;
    expect(response.body.length).toBe(postedEntriesCount);
    response.body.forEach((entry: PrismaEntry) => {
      expect(entry.status).toBe('POSTED');
    });
  });

  it('should filter entries by status=EXPECTED', async () => {
    const response = await request(server).get(`/api/accounts/${testAccount.account_id}/entries?status=EXPECTED`);
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    const expectedEntriesCount = entryData.filter(e => e.status === 'EXPECTED').length;
    expect(response.body.length).toBe(expectedEntriesCount);
    response.body.forEach((entry: PrismaEntry) => {
      expect(entry.status).toBe('EXPECTED');
    });
  });

  it('should return an empty array if no entries match filter (using ARCHIVED)', async () => {
    const response = await request(server).get(`/api/accounts/${testAccount.account_id}/entries?status=ARCHIVED`);
    expect(response.statusCode).toBe(200); 
    expect(response.body).toBeInstanceOf(Array);
    const archivedEntriesCount = entryData.filter(e => e.status === 'ARCHIVED').length;
    expect(response.body.length).toBe(archivedEntriesCount);
     if (archivedEntriesCount > 0) {
      response.body.forEach((entry: PrismaEntry) => {
        expect(entry.status).toBe('ARCHIVED');
      });
    }
  });

  it('should return 404 if the account ID does not exist', async () => {
    const nonExistentAccountId = 'non-existent-account-id-123';
    const response = await request(server).get(`/api/accounts/${nonExistentAccountId}/entries`);
    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('error', 'Account not found.');
  });

  it('should return entries ordered by effective_date descending', async () => {
    const response = await request(server).get(`/api/accounts/${testAccount.account_id}/entries`);
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBeGreaterThan(1);
    for (let i = 0; i < response.body.length - 1; i++) {
      const date1 = new Date(response.body[i].effective_date);
      const date2 = new Date(response.body[i+1].effective_date);
      expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
    }
  });
});
