import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/services/prisma';
import { AccountType, StagingEntryProcessingMode, MerchantAccount, Account as PrismaAccount, StagingEntry as PrismaStagingEntry, EntryType } from '@prisma/client';
import * as stagingEntryCore from '../../src/server/core/staging-entry';
import logger from '../../src/services/logger';
import { Express } from 'express';

const mockPrismaClient = prisma as any;

describe('Staging Entry API Endpoints', () => {
  let merchant: MerchantAccount;
  let account: PrismaAccount;
  let server: Express;

  beforeAll(async () => {
    server = app;
    merchant = await mockPrismaClient.merchantAccount.upsert({
      where: { merchant_id: 'staging_m001_jest' },
      update: {},
      create: { merchant_id: 'staging_m001_jest', merchant_name: 'Staging Test Merchant' },
    });
    account = await mockPrismaClient.account.create({
      data: {
        merchant_id: merchant.merchant_id,
        account_name: 'Staging Test Account',
        account_type: AccountType.DEBIT_NORMAL,
        currency: 'USD',
      },
    });
  });

  afterEach(async () => {
    await mockPrismaClient.stagingEntry.deleteMany({});
  });

  afterAll(async () => {
    await mockPrismaClient.stagingEntry.deleteMany({});
    await mockPrismaClient.account.deleteMany({ where: { merchant_id: merchant.merchant_id } });
    await mockPrismaClient.merchantAccount.delete({ where: { merchant_id: merchant.merchant_id } });
    await mockPrismaClient.$disconnect();
  });

  describe('POST /api/accounts/:account_id/staging-entries', () => {
    it('should create a new staging entry successfully with processing_mode CONFIRMATION', async () => {
      const entryData = {
        // account_id is from path param
        entry_type: 'DEBIT',
        amount: 100.50,
        currency: 'USD',
        effective_date: new Date().toISOString(),
        processing_mode: StagingEntryProcessingMode.CONFIRMATION,
        metadata: { source: 'test' }
      };
      const response = await request(server)
        .post(`/api/accounts/${account.account_id}/staging-entries`)
        .send(entryData);
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('staging_entry_id');
      expect(response.body.status).toBe('PENDING');
      expect(response.body.processing_mode).toBe('CONFIRMATION');
      expect(response.body.amount.toString()).toBe('100.5'); // Prisma Decimal might be stringified
      expect(response.body.discarded_at).toBeNull();
    });

    it('should create a new staging entry successfully with processing_mode TRANSACTION and discarded_at', async () => {
      const discardedDate = new Date().toISOString();
      const entryData = {
        entry_type: 'CREDIT',
        amount: 200.00,
        currency: 'EUR',
        effective_date: new Date().toISOString(),
        processing_mode: StagingEntryProcessingMode.TRANSACTION,
        metadata: { reason: 'duplicate' },
        discarded_at: discardedDate
      };
      const response = await request(server)
        .post(`/api/accounts/${account.account_id}/staging-entries`)
        .send(entryData);
      expect(response.statusCode).toBe(201);
      expect(response.body.processing_mode).toBe('TRANSACTION');
      expect(new Date(response.body.discarded_at).toISOString()).toBe(discardedDate);
    });

    it('should return 400 for missing processing_mode in body', async () => {
        const entryData = { 
            entry_type: 'DEBIT', 
            amount: 100, 
            currency: 'USD',
            effective_date: new Date().toISOString(),
        };
        const response = await request(server)
          .post(`/api/accounts/${account.account_id}/staging-entries`)
          .send(entryData);
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toContain('Invalid or missing processing_mode');
    });
    
    it('should return 400 for invalid processing_mode in body', async () => {
      const entryData = {
        entry_type: 'DEBIT',
        amount: 100.50,
        currency: 'USD',
        effective_date: new Date().toISOString(),
        processing_mode: 'INVALID_MODE', 
        metadata: { source: 'test' }
      };
      const response = await request(server)
        .post(`/api/accounts/${account.account_id}/staging-entries`)
        .send(entryData);
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Invalid or missing processing_mode');
    });

    it('should return 400 for missing other required fields in body (e.g. amount)', async () => {
        const entryData = { 
            entry_type: 'DEBIT', 
            currency: 'USD',
            effective_date: new Date().toISOString(),
            processing_mode: StagingEntryProcessingMode.CONFIRMATION,
        };
        const response = await request(server)
          .post(`/api/accounts/${account.account_id}/staging-entries`)
          .send(entryData);
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toContain('Missing required fields in body');
    });
    
    it('should return 400 for invalid entry_type in body', async () => {
        const entryData = {
            entry_type: 'INVALID_TYPE',
            amount: 100.50,
            currency: 'USD',
            effective_date: new Date().toISOString(),
            processing_mode: StagingEntryProcessingMode.CONFIRMATION,
        };
        const response = await request(server)
          .post(`/api/accounts/${account.account_id}/staging-entries`)
          .send(entryData);
        expect(response.statusCode).toBe(400);
        // The core logic error for invalid enum is specific
        expect(response.body.error).toContain('Invalid input for staging entry creation'); 
    });
  });

  describe('GET /api/accounts/:account_id/staging-entries', () => {
    let otherAccount: PrismaAccount;
    beforeAll(async () => { // Changed to beforeAll for this describe block
        otherAccount = await mockPrismaClient.account.create({
            data: {
                merchant_id: merchant.merchant_id,
                account_name: 'Other Staging Test Account',
                account_type: AccountType.CREDIT_NORMAL,
                currency: 'EUR',
            },
        });
    });
    afterAll(async () => { // Changed to afterAll
        await mockPrismaClient.account.delete({ where: { account_id: otherAccount.account_id }});
    });

    beforeEach(async () => { // Keep this beforeEach for staging entry creation
        await stagingEntryCore.createStagingEntry(account.account_id, { entry_type: EntryType.CREDIT, amount: 50, currency: 'USD', effective_date: new Date(), processing_mode: StagingEntryProcessingMode.CONFIRMATION });
        await stagingEntryCore.createStagingEntry(account.account_id, { entry_type: EntryType.DEBIT, amount: 25, currency: 'USD', effective_date: new Date(), processing_mode: StagingEntryProcessingMode.TRANSACTION });
        await stagingEntryCore.createStagingEntry(otherAccount.account_id, { entry_type: EntryType.DEBIT, amount: 75, currency: 'EUR', effective_date: new Date(), processing_mode: StagingEntryProcessingMode.CONFIRMATION });
    });

    it('should list all staging entries for the specified account_id', async () => {
      const response = await request(server).get(`/api/accounts/${account.account_id}/staging-entries`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(2);
      response.body.forEach((entry: PrismaStagingEntry) => {
        expect(entry.account_id).toBe(account.account_id);
      });
    });

    it('should filter staging entries by status for the specified account_id', async () => {
      const entriesForAccount = await stagingEntryCore.listStagingEntries(account.account_id);
      await mockPrismaClient.stagingEntry.update({
          where: { staging_entry_id: entriesForAccount[0].staging_entry_id },
          data: { status: 'PROCESSED' }
      });

      const response = await request(server).get(`/api/accounts/${account.account_id}/staging-entries?status=PROCESSED`);
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(1); 
      expect(response.body[0].status).toBe('PROCESSED');
      expect(response.body[0].account_id).toBe(account.account_id);
    });
    
    it('should include account details in listed entries', async () => {
        const response = await request(server).get(`/api/accounts/${account.account_id}/staging-entries`);
        expect(response.statusCode).toBe(200);
        expect(response.body[0].account).toBeDefined();
        expect(response.body[0].account.account_name).toBe('Staging Test Account');
    });
  });

  describe('POST /api/accounts/:account_id/staging-entries/files', () => {
    const validCsvData = `order_id,amount,currency,transaction_date,type\norder1,100.00,USD,2023-01-01T10:00:00Z,Payment\norder2,50.00,USD,2023-01-01T11:00:00Z,Refund`;
    const mixedCsvData = `order_id,amount,currency,transaction_date,type\norder3,200.00,USD,2023-01-02T10:00:00Z,Payment\n,150.00,USD,2023-01-02T11:00:00Z,Payment\norder5,abc,USD,2023-01-02T12:00:00Z,Refund\norder6,75.00,USD,invalid-date,Payment\norder7,25.00,USD,2023-01-02T14:00:00Z,InvalidType`;
    const onlyInvalidCsvData = `order_id,amount,currency,transaction_date,type\norder8,xyz,USD,baddate,FakePayment`;

    it('should successfully ingest a valid CSV file with processing_mode CONFIRMATION', async () => {
      const response = await request(server)
        .post(`/api/accounts/${account.account_id}/staging-entries/files`)
        .field('processing_mode', StagingEntryProcessingMode.CONFIRMATION)
        .attach('file', Buffer.from(validCsvData), 'test.csv');

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('File processing complete.');
      expect(response.body.successful_ingestions).toBe(2);
      expect(response.body.failed_ingestions).toBe(0);
      expect(response.body.errors.length).toBe(0);

      const stagingEntries = await mockPrismaClient.stagingEntry.findMany({ where: { account_id: account.account_id } });
      expect(stagingEntries.length).toBe(2);
      const paymentEntry = stagingEntries.find((e: PrismaStagingEntry) => (e.metadata as any).order_id === 'order1');
      expect(paymentEntry!.entry_type).toBe('DEBIT');
      expect(paymentEntry!.amount.toString()).toBe('100');
      expect(paymentEntry!.processing_mode).toBe('CONFIRMATION');
      const refundEntry = stagingEntries.find((e: PrismaStagingEntry) => (e.metadata as any).order_id === 'order2');
      expect(refundEntry!.entry_type).toBe('CREDIT');
      expect(refundEntry!.amount.toString()).toBe('50');
      expect(refundEntry!.processing_mode).toBe('CONFIRMATION');
    });

    it('should process a CSV with mixed valid and invalid rows (207 Multi-Status) with processing_mode TRANSACTION', async () => {
      const response = await request(server)
        .post(`/api/accounts/${account.account_id}/staging-entries/files`)
        .field('processing_mode', StagingEntryProcessingMode.TRANSACTION)
        .attach('file', Buffer.from(mixedCsvData), 'mixed.csv');
      
      expect(response.statusCode).toBe(207);
      expect(response.body.message).toBe('File processing complete.');
      expect(response.body.successful_ingestions).toBe(1);
      expect(response.body.failed_ingestions).toBe(4);
      expect(response.body.errors.length).toBe(4);

      const errorRow2 = response.body.errors.find((e: any) => e.row_number === 2);
      expect(errorRow2.error_details).toContain('Missing required field: order_id');
      
      const errorRow3 = response.body.errors.find((e: any) => e.row_number === 3);
      expect(errorRow3.error_details).toContain("Invalid amount: 'abc' is not a number.");

      const errorRow4 = response.body.errors.find((e: any) => e.row_number === 4);
      expect(errorRow4.error_details).toContain("Invalid transaction_date: 'invalid-date' is not a valid date.");
      
      const errorRow5 = response.body.errors.find((e: any) => e.row_number === 5);
      expect(errorRow5.error_details).toContain("Invalid type: 'InvalidType'. Must be 'Payment', 'Refund', 'Debit', or 'Credit'.");

      const stagingEntries = await mockPrismaClient.stagingEntry.findMany({ where: { account_id: account.account_id } });
      expect(stagingEntries.length).toBe(1);
      expect((stagingEntries[0].metadata as any).order_id).toBe('order3');
      expect(stagingEntries[0].processing_mode).toBe('TRANSACTION');
    });

    it('should return 207 if all rows in CSV are invalid (processing_mode provided)', async () => {
        const response = await request(server)
          .post(`/api/accounts/${account.account_id}/staging-entries/files`)
          .field('processing_mode', StagingEntryProcessingMode.CONFIRMATION)
          .attach('file', Buffer.from(onlyInvalidCsvData), 'all_invalid.csv');
  
        expect(response.statusCode).toBe(207); 
        expect(response.body.message).toBe('File processing complete.');
        expect(response.body.successful_ingestions).toBe(0);
        expect(response.body.failed_ingestions).toBe(1);
        expect(response.body.errors.length).toBe(1);
        expect(response.body.errors[0].row_number).toBe(1);
        expect(response.body.errors[0].error_details).toContain("Invalid amount: 'xyz' is not a number.");
        expect(response.body.errors[0].error_details).toContain("Invalid transaction_date: 'baddate' is not a valid date.");
        expect(response.body.errors[0].error_details).toContain("Invalid type: 'FakePayment'. Must be 'Payment', 'Refund', 'Debit', or 'Credit'.");

        const stagingEntries = await mockPrismaClient.stagingEntry.findMany({ where: { account_id: account.account_id } });
        expect(stagingEntries.length).toBe(0);
      });

    it('should return 400 if no file is uploaded', async () => {
      const response = await request(server)
        .post(`/api/accounts/${account.account_id}/staging-entries/files`)
        .field('processing_mode', StagingEntryProcessingMode.CONFIRMATION);
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('No file uploaded.');
    });

    it('should return 400 if processing_mode is missing for file upload', async () => {
      const response = await request(server)
        .post(`/api/accounts/${account.account_id}/staging-entries/files`)
        .attach('file', Buffer.from(validCsvData), 'test.csv');
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Invalid or missing processing_mode form field');
    });

    it('should return 400 for non-CSV file type (with processing_mode)', async () => {
      const response = await request(server)
        .post(`/api/accounts/${account.account_id}/staging-entries/files`)
        .field('processing_mode', StagingEntryProcessingMode.TRANSACTION)
        .attach('file', Buffer.from('this is not a csv'), 'test.txt');
      
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('Invalid file type. Only CSV files are allowed.');
    });

    it('should return 404 if account_id does not exist (with processing_mode)', async () => {
      const response = await request(server)
        .post(`/api/accounts/non_existent_account_id_123/staging-entries/files`)
        .field('processing_mode', StagingEntryProcessingMode.CONFIRMATION)
        .attach('file', Buffer.from(validCsvData), 'test.csv');
      
      expect(response.statusCode).toBe(404);
      expect(response.body.error).toBe('Account with ID non_existent_account_id_123 not found.');
    });
  });
});
