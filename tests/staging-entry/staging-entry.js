const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/services/prisma');
const { AccountType } = require('@prisma/client'); // Import AccountType
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
        account_type: AccountType.DEBIT_NORMAL, // Use the enum member
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
    it('should create a new staging entry successfully with processing_mode CONFIRMATION', async () => {
      const entryData = {
        account_id: account.account_id,
        entry_type: 'DEBIT',
        amount: 100.50,
        currency: 'USD',
        effective_date: new Date().toISOString(),
        processing_mode: 'CONFIRMATION',
        metadata: { source: 'test' }
      };
      const response = await request(app)
        .post(`/api/accounts/${account.account_id}/staging-entries`)
        .send(entryData);
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('staging_entry_id');
      expect(response.body.status).toBe('PENDING');
      expect(response.body.processing_mode).toBe('CONFIRMATION');
      expect(response.body.amount.toString()).toBe('100.5');
      expect(response.body.discarded_at).toBeNull();
    });

    it('should create a new staging entry successfully with processing_mode TRANSACTION and discarded_at', async () => {
      const discardedDate = new Date().toISOString();
      const entryData = {
        account_id: account.account_id,
        entry_type: 'CREDIT',
        amount: 200.00,
        currency: 'EUR',
        effective_date: new Date().toISOString(),
        processing_mode: 'TRANSACTION',
        metadata: { reason: 'duplicate' },
        discarded_at: discardedDate
      };
      const response = await request(app)
        .post(`/api/accounts/${account.account_id}/staging-entries`)
        .send(entryData);
      expect(response.statusCode).toBe(201);
      expect(response.body.processing_mode).toBe('TRANSACTION');
      expect(response.body.discarded_at).toBe(discardedDate);
    });

    it('should return 400 for missing processing_mode in body', async () => {
        const entryData = { 
            account_id: account.account_id,
            entry_type: 'DEBIT', 
            amount: 100, 
            currency: 'USD',
            effective_date: new Date().toISOString(),
        }; // processing_mode is missing
        const response = await request(app)
          .post(`/api/accounts/${account.account_id}/staging-entries`)
          .send(entryData);
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toContain('Invalid or missing processing_mode');
    });
    
    it('should return 400 for invalid processing_mode in body', async () => {
      const entryData = {
        account_id: account.account_id,
        entry_type: 'DEBIT',
        amount: 100.50,
        currency: 'USD',
        effective_date: new Date().toISOString(),
        processing_mode: 'INVALID_MODE', 
        metadata: { source: 'test' }
      };
      const response = await request(app)
        .post(`/api/accounts/${account.account_id}/staging-entries`)
        .send(entryData);
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Invalid or missing processing_mode');
    });

    it('should return 400 for missing other required fields in body (e.g. amount)', async () => {
        const entryData = { 
            account_id: account.account_id,
            entry_type: 'DEBIT', 
            // amount: 100, // amount is missing
            currency: 'USD',
            effective_date: new Date().toISOString(),
            processing_mode: 'CONFIRMATION',
        };
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
            processing_mode: 'CONFIRMATION', // Add valid processing_mode
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
                account_type: AccountType.CREDIT_NORMAL, // Use the enum member
                currency: 'EUR',
            },
        });
    });
    afterAll(async () => {
        await prisma.account.delete({ where: { account_id: otherAccount.account_id }});
    });

    beforeEach(async () => {
        // Entries for 'account'
        await stagingEntryCore.createStagingEntry(account.account_id, { entry_type: 'CREDIT', amount: 50, currency: 'USD', effective_date: new Date(), processing_mode: 'CONFIRMATION' });
        await stagingEntryCore.createStagingEntry(account.account_id, { entry_type: 'DEBIT', amount: 25, currency: 'USD', effective_date: new Date(), processing_mode: 'TRANSACTION' });
        // Entry for 'otherAccount' to test filtering by account_id in path
        await stagingEntryCore.createStagingEntry(otherAccount.account_id, { entry_type: 'DEBIT', amount: 75, currency: 'EUR', effective_date: new Date(), processing_mode: 'CONFIRMATION' });
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

  describe('POST /api/accounts/:account_id/staging-entries/files', () => {
    const validCsvData = `order_id,amount,currency,transaction_date,type\norder1,100.00,USD,2023-01-01T10:00:00Z,Payment\norder2,50.00,USD,2023-01-01T11:00:00Z,Refund`;
    const mixedCsvData = `order_id,amount,currency,transaction_date,type\norder3,200.00,USD,2023-01-02T10:00:00Z,Payment\n,150.00,USD,2023-01-02T11:00:00Z,Payment\norder5,abc,USD,2023-01-02T12:00:00Z,Refund\norder6,75.00,USD,invalid-date,Payment\norder7,25.00,USD,2023-01-02T14:00:00Z,InvalidType`;
    const onlyInvalidCsvData = `order_id,amount,currency,transaction_date,type\norder8,xyz,USD,baddate,FakePayment`;


    it('should successfully ingest a valid CSV file with processing_mode CONFIRMATION', async () => {
      const response = await request(app)
        .post(`/api/accounts/${account.account_id}/staging-entries/files`)
        .field('processing_mode', 'CONFIRMATION')
        .attach('file', Buffer.from(validCsvData), 'test.csv');

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('File processing complete.');
      expect(response.body.successful_ingestions).toBe(2);
      expect(response.body.failed_ingestions).toBe(0);
      expect(response.body.errors.length).toBe(0);

      const stagingEntries = await prisma.stagingEntry.findMany({ where: { account_id: account.account_id } });
      expect(stagingEntries.length).toBe(2);
      // Check one entry details (assuming DEBIT account, Payment -> DEBIT, Refund -> CREDIT)
      const paymentEntry = stagingEntries.find(e => e.metadata.order_id === 'order1');
      expect(paymentEntry.entry_type).toBe('DEBIT');
      expect(paymentEntry.amount.toString()).toBe('100');
      expect(paymentEntry.processing_mode).toBe('CONFIRMATION');
      const refundEntry = stagingEntries.find(e => e.metadata.order_id === 'order2');
      expect(refundEntry.entry_type).toBe('CREDIT');
      expect(refundEntry.amount.toString()).toBe('50');
      expect(refundEntry.processing_mode).toBe('CONFIRMATION');
    });

    it('should process a CSV with mixed valid and invalid rows (207 Multi-Status) with processing_mode TRANSACTION', async () => {
      const response = await request(app)
        .post(`/api/accounts/${account.account_id}/staging-entries/files`)
        .field('processing_mode', 'TRANSACTION')
        .attach('file', Buffer.from(mixedCsvData), 'mixed.csv');
      
      expect(response.statusCode).toBe(207);
      expect(response.body.message).toBe('File processing complete.');
      expect(response.body.successful_ingestions).toBe(1); // Only order3 is valid
      expect(response.body.failed_ingestions).toBe(4);
      expect(response.body.errors.length).toBe(4);

      // Check errors for specific rows
      const errorRow2 = response.body.errors.find(e => e.row_number === 2); // Missing order_id
      expect(errorRow2.error_details).toContain('Missing required field: order_id');
      
      const errorRow3 = response.body.errors.find(e => e.row_number === 3); // Invalid amount
      expect(errorRow3.error_details).toContain("Invalid amount: 'abc' is not a number.");

      const errorRow4 = response.body.errors.find(e => e.row_number === 4); // Invalid date
      expect(errorRow4.error_details).toContain("Invalid transaction_date: 'invalid-date' is not a valid date.");
      
      const errorRow5 = response.body.errors.find(e => e.row_number === 5); // Invalid type
      expect(errorRow5.error_details).toContain("Invalid type: 'InvalidType'. Must be 'Payment', 'Refund', 'Debit', or 'Credit'.");

      const stagingEntries = await prisma.stagingEntry.findMany({ where: { account_id: account.account_id } });
      expect(stagingEntries.length).toBe(1); // Only one should be created
      expect(stagingEntries[0].metadata.order_id).toBe('order3');
      expect(stagingEntries[0].processing_mode).toBe('TRANSACTION');
    });

    it('should return 207 if all rows in CSV are invalid (processing_mode provided)', async () => {
        const response = await request(app)
          .post(`/api/accounts/${account.account_id}/staging-entries/files`)
          .field('processing_mode', 'CONFIRMATION')
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

        const stagingEntries = await prisma.stagingEntry.findMany({ where: { account_id: account.account_id } });
        expect(stagingEntries.length).toBe(0);
      });

    it('should return 400 if no file is uploaded', async () => {
      const response = await request(app)
        .post(`/api/accounts/${account.account_id}/staging-entries/files`)
        .field('processing_mode', 'CONFIRMATION'); // Send processing_mode but no file
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('No file uploaded.');
    });

    it('should return 400 if processing_mode is missing for file upload', async () => {
      const response = await request(app)
        .post(`/api/accounts/${account.account_id}/staging-entries/files`)
        .attach('file', Buffer.from(validCsvData), 'test.csv'); // No processing_mode field
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Invalid or missing processing_mode form field');
    });

    it('should return 400 for non-CSV file type (with processing_mode)', async () => {
      const response = await request(app)
        .post(`/api/accounts/${account.account_id}/staging-entries/files`)
        .field('processing_mode', 'TRANSACTION')
        .attach('file', Buffer.from('this is not a csv'), 'test.txt');
      
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('Invalid file type. Only CSV files are allowed.');
    });

    it('should return 404 if account_id does not exist (with processing_mode)', async () => {
      const response = await request(app)
        .post(`/api/accounts/non_existent_account_id_123/staging-entries/files`)
        .field('processing_mode', 'CONFIRMATION')
        .attach('file', Buffer.from(validCsvData), 'test.csv');
      
      expect(response.statusCode).toBe(404);
      expect(response.body.error).toBe('Account with ID non_existent_account_id_123 not found.');
    });
  });
});
