// Mock the logger to prevent console output during tests
jest.mock('../../../src/services/logger.js', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
}));

const actualTransactionCore = jest.requireActual('../../../src/server/core/transaction');
const mockTransactionCore = {
  ...actualTransactionCore,
  createTransactionInternal: jest.fn(actualTransactionCore.createTransactionInternal),
};
jest.mock('../../../src/server/core/transaction/index.js', () => mockTransactionCore);

const prisma = require('../../../src/services/prisma');
const { processStagingEntryWithRecon } = require('../../../src/server/core/recon-engine/engine.js');
const { EntryStatus, EntryType, StagingEntryStatus, TransactionStatus, AccountType } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

describe('Recon Engine - Staging Entry Matching & Fulfillment', () => {
  let merchant;
  let account1; // Typically source
  let account2; // Typically destination/expecting

  beforeAll(async () => {
    merchant = await prisma.merchantAccount.create({
      data: { merchant_id: 'test-merchant-recon-match', merchant_name: 'Test Merchant Recon Matching' },
    });
    account1 = await prisma.account.create({
      data: { account_id: 'acc_match_1', merchant_id: merchant.merchant_id, account_name: 'Matching Account 1 (Source)', account_type: AccountType.DEBIT_NORMAL, currency: 'USD' },
    });
    account2 = await prisma.account.create({
      data: { account_id: 'acc_match_2', merchant_id: merchant.merchant_id, account_name: 'Matching Account 2 (Expecting)', account_type: AccountType.CREDIT_NORMAL, currency: 'USD' },
    });
  });

  afterAll(async () => {
    await prisma.stagingEntry.deleteMany({});
    await prisma.entry.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.reconRule.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.merchantAccount.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.stagingEntry.deleteMany({});
    await prisma.entry.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.reconRule.deleteMany({});
    jest.clearAllMocks();
    mockTransactionCore.createTransactionInternal.mockImplementation(actualTransactionCore.createTransactionInternal);
  });

  test('Scenario 1: Successful Match & Fulfillment (StagingEntry for account_two_id)', async () => {
    await prisma.reconRule.create({
      data: { merchant_id: merchant.merchant_id, account_one_id: account1.account_id, account_two_id: account2.account_id },
    });
    const orderId = 'order_fulfill_success';
    const originalTransaction = await prisma.transaction.create({
      data: {
        merchant_id: merchant.merchant_id, status: TransactionStatus.EXPECTED, logical_transaction_id: `ltid_${orderId}`,
        entries: { create: [
            { account_id: account1.account_id, entry_type: EntryType.DEBIT, amount: new Decimal('123.45'), currency: 'USD', status: EntryStatus.POSTED, effective_date: new Date(), metadata: { order_id: orderId } },
            { account_id: account2.account_id, entry_type: EntryType.CREDIT, amount: new Decimal('123.45'), currency: 'USD', status: EntryStatus.EXPECTED, effective_date: new Date(), metadata: { order_id: orderId } },
        ]},
      }, include: { entries: true },
    });
    const expectedEntry = originalTransaction.entries.find(e => e.status === EntryStatus.EXPECTED && e.account_id === account2.account_id);

    const fulfillingStagingEntry = await prisma.stagingEntry.create({
      data: { account_id: account2.account_id, entry_type: EntryType.CREDIT, amount: new Decimal('123.45'), currency: 'USD', status: StagingEntryStatus.PENDING, effective_date: new Date(), metadata: { order_id: orderId } },
    });

    const result = await processStagingEntryWithRecon(fulfillingStagingEntry, merchant.merchant_id);
    expect(result.status).toBe(TransactionStatus.POSTED);
    // ... further assertions for evolved transaction, staging entry PROCESSED and discarded_at set, original transaction ARCHIVED, original entries ARCHIVED and discarded_at set ...
    const updatedStagingEntry = await prisma.stagingEntry.findUnique({ where: { staging_entry_id: fulfillingStagingEntry.staging_entry_id } });
    expect(updatedStagingEntry.status).toBe(StagingEntryStatus.PROCESSED);
    expect(updatedStagingEntry.discarded_at).not.toBeNull();
    const archivedTx = await prisma.transaction.findUnique({ where: { transaction_id: originalTransaction.transaction_id } });
    expect(archivedTx.status).toBe(TransactionStatus.ARCHIVED);
    const archivedEntries = await prisma.entry.findMany({ where: { transaction_id: originalTransaction.transaction_id } });
    archivedEntries.forEach(e => expect(e.status).toBe(EntryStatus.ARCHIVED));
  });

  test('Scenario 2: Mismatch (Amount Differs, StagingEntry for account_two_id)', async () => {
    await prisma.reconRule.create({
      data: { merchant_id: merchant.merchant_id, account_one_id: account1.account_id, account_two_id: account2.account_id },
    });
    const orderId = 'order_mismatch_amount';
    const originalTransaction = await prisma.transaction.create({ /* ... setup with expected amount 100 ... */ 
      data: { merchant_id: merchant.merchant_id, status: TransactionStatus.EXPECTED, logical_transaction_id: `ltid_${orderId}`, entries: { create: [
        { account_id: account1.account_id, entry_type: EntryType.DEBIT, amount: new Decimal('100.00'), currency: 'USD', status: EntryStatus.POSTED, effective_date: new Date(), metadata: { order_id: orderId } },
        { account_id: account2.account_id, entry_type: EntryType.CREDIT, amount: new Decimal('100.00'), currency: 'USD', status: EntryStatus.EXPECTED, effective_date: new Date(), metadata: { order_id: orderId } },
      ]}}
    });
    const mismatchStagingEntry = await prisma.stagingEntry.create({
      data: { account_id: account2.account_id, entry_type: EntryType.CREDIT, amount: new Decimal('99.00'), currency: 'USD', status: StagingEntryStatus.PENDING, effective_date: new Date(), metadata: { order_id: orderId } },
    });
    await expect(processStagingEntryWithRecon(mismatchStagingEntry, merchant.merchant_id))
      .rejects.toThrow(/Mismatch detected/);
    const updatedStagingEntry = await prisma.stagingEntry.findUnique({ where: { staging_entry_id: mismatchStagingEntry.staging_entry_id } });
    expect(updatedStagingEntry.status).toBe(StagingEntryStatus.NEEDS_MANUAL_REVIEW);
    expect(updatedStagingEntry.discarded_at).toBeNull();
  });

  test('Scenario 3: No Match Found (StagingEntry for account_one_id - match attempt bypassed)', async () => {
    await prisma.reconRule.create({
      data: { merchant_id: merchant.merchant_id, account_one_id: account1.account_id, account_two_id: account2.account_id },
    });
    const orderId = 'order_bypass_match';
    const stagingEntryForAcc1 = await prisma.stagingEntry.create({
      data: { account_id: account1.account_id, entry_type: EntryType.DEBIT, amount: new Decimal('50.00'), currency: 'USD', status: StagingEntryStatus.PENDING, effective_date: new Date(), metadata: { order_id: orderId } },
    });
    await expect(processStagingEntryWithRecon(stagingEntryForAcc1, merchant.merchant_id))
      .rejects.toThrow(/No matching expected entry found/);
    const updatedStagingEntry = await prisma.stagingEntry.findUnique({ where: { staging_entry_id: stagingEntryForAcc1.staging_entry_id } });
    expect(updatedStagingEntry.status).toBe(StagingEntryStatus.NEEDS_MANUAL_REVIEW);
    expect(updatedStagingEntry.discarded_at).toBeNull();
  });

  test('Scenario 3b: No Match Found (No ReconRule exists)', async () => {
    const orderId = 'order_no_rule';
    const stagingEntryNoRule = await prisma.stagingEntry.create({
      data: { account_id: account1.account_id, entry_type: EntryType.DEBIT, amount: new Decimal('60.00'), currency: 'USD', status: StagingEntryStatus.PENDING, effective_date: new Date(), metadata: { order_id: orderId } },
    });
    await expect(processStagingEntryWithRecon(stagingEntryNoRule, merchant.merchant_id))
      .rejects.toThrow(/No matching expected entry found/);
    const updatedStagingEntry = await prisma.stagingEntry.findUnique({ where: { staging_entry_id: stagingEntryNoRule.staging_entry_id } });
    expect(updatedStagingEntry.status).toBe(StagingEntryStatus.NEEDS_MANUAL_REVIEW);
    expect(updatedStagingEntry.discarded_at).toBeNull();
  });

  test('Scenario 3c: No Match Found (order_id is null, match attempt bypassed)', async () => {
    await prisma.reconRule.create({
      data: { merchant_id: merchant.merchant_id, account_one_id: account1.account_id, account_two_id: account2.account_id },
    });
    const stagingEntryNoOrderId = await prisma.stagingEntry.create({
      data: { account_id: account2.account_id, entry_type: EntryType.CREDIT, amount: new Decimal('70.00'), currency: 'USD', status: StagingEntryStatus.PENDING, effective_date: new Date(), metadata: { note: 'no order id' } },
    });
    await expect(processStagingEntryWithRecon(stagingEntryNoOrderId, merchant.merchant_id))
      .rejects.toThrow(/No matching expected entry found/);
    const updatedStagingEntry = await prisma.stagingEntry.findUnique({ where: { staging_entry_id: stagingEntryNoOrderId.staging_entry_id } });
    expect(updatedStagingEntry.status).toBe(StagingEntryStatus.NEEDS_MANUAL_REVIEW);
    expect(updatedStagingEntry.discarded_at).toBeNull();
  });

  test('Scenario 4: Ambiguous Match (StagingEntry for account_two_id)', async () => {
    await prisma.reconRule.create({
      data: { merchant_id: merchant.merchant_id, account_one_id: account1.account_id, account_two_id: account2.account_id },
    });
    const orderIdAmbiguous = 'order_ambiguous_manual';
    // Create two transactions with EXPECTED entries for the same order_id on account2
    await prisma.transaction.create({
      data: { merchant_id: merchant.merchant_id, status: TransactionStatus.EXPECTED, logical_transaction_id: `ltid_${orderIdAmbiguous}_1`, entries: { create: [
        { account_id: account1.account_id, entry_type: EntryType.DEBIT, amount: new Decimal('50.00'), currency: 'USD', status: EntryStatus.POSTED, effective_date: new Date(), metadata: { order_id: orderIdAmbiguous } },
        { account_id: account2.account_id, entry_type: EntryType.CREDIT, amount: new Decimal('50.00'), currency: 'USD', status: EntryStatus.EXPECTED, effective_date: new Date(), metadata: { order_id: orderIdAmbiguous } },
      ]}}
    });
    await prisma.transaction.create({
      data: { merchant_id: merchant.merchant_id, status: TransactionStatus.EXPECTED, logical_transaction_id: `ltid_${orderIdAmbiguous}_2`, entries: { create: [
        { account_id: account1.account_id, entry_type: EntryType.DEBIT, amount: new Decimal('75.00'), currency: 'USD', status: EntryStatus.POSTED, effective_date: new Date(), metadata: { order_id: orderIdAmbiguous } },
        { account_id: account2.account_id, entry_type: EntryType.CREDIT, amount: new Decimal('75.00'), currency: 'USD', status: EntryStatus.EXPECTED, effective_date: new Date(), metadata: { order_id: orderIdAmbiguous } },
      ]}}
    });

    const stagingEntryAmbig = await prisma.stagingEntry.create({
      data: { account_id: account2.account_id, entry_type: EntryType.CREDIT, amount: new Decimal('50.00'), currency: 'USD', status: StagingEntryStatus.PENDING, effective_date: new Date(), metadata: { order_id: orderIdAmbiguous } },
    });
    await expect(processStagingEntryWithRecon(stagingEntryAmbig, merchant.merchant_id))
      .rejects.toThrow(/Ambiguous match/);
    const updatedStagingEntry = await prisma.stagingEntry.findUnique({ where: { staging_entry_id: stagingEntryAmbig.staging_entry_id } });
    expect(updatedStagingEntry.status).toBe(StagingEntryStatus.NEEDS_MANUAL_REVIEW);
    expect(updatedStagingEntry.discarded_at).toBeNull();
  });
});
