// Mock the logger to prevent console output during tests
jest.mock('../../../src/services/logger.js', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
}));

// Mock transactionCore.createTransactionInternal for Phase 1 as we are not testing fulfillment yet
// This needs to be defined before it's potentially used by the engine.js import if there are circular dependencies
const actualTransactionCore = jest.requireActual('../../../src/server/core/transaction');
const mockTransactionCore = {
  ...actualTransactionCore,
  createTransactionInternal: jest.fn(actualTransactionCore.createTransactionInternal), // Initially use the real one
};
jest.mock('../../../src/server/core/transaction/index.js', () => mockTransactionCore);

const prisma = require('../../../src/services/prisma');
const { processStagingEntryWithRecon, NoReconRuleFoundError } = require('../../../src/server/core/recon-engine/engine.js');
const { EntryStatus, EntryType, StagingEntryStatus, TransactionStatus, AccountType } = require('@prisma/client'); // Ensured AccountType is imported
const { Decimal } = require('@prisma/client/runtime/library');


describe('Recon Engine - Staging Entry Matching & Fulfillment (Phase 1 & 2)', () => {
  let merchant;
  let account1;
  let account2;
  let reconRule;

  beforeAll(async () => {
    // Setup initial data like merchant, accounts, recon rule
    merchant = await prisma.merchantAccount.create({
      data: {
        merchant_id: 'test-merchant-recon-phase1',
        merchant_name: 'Test Merchant Recon Phase 1',
      },
    });

    account1 = await prisma.account.create({
      data: {
        account_id: 'acc_recon_p1_1',
        merchant_id: merchant.merchant_id,
        account_name: 'Test Account 1',
        account_type: AccountType.DEBIT_NORMAL,
        currency: 'USD',
      },
    });

    account2 = await prisma.account.create({
      data: {
        account_id: 'acc_recon_p1_2',
        merchant_id: merchant.merchant_id,
        account_name: 'Test Account 2',
        account_type: AccountType.CREDIT_NORMAL,
        currency: 'USD',
      },
    });

    reconRule = await prisma.reconRule.create({
      data: {
        merchant_id: merchant.merchant_id,
        account_one_id: account1.account_id,
        account_two_id: account2.account_id,
      },
    });
  });

  afterAll(async () => {
    // Clean up database
    await prisma.stagingEntry.deleteMany({});
    await prisma.entry.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.reconRule.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.merchantAccount.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear relevant tables before each test
    await prisma.stagingEntry.deleteMany({});
    await prisma.entry.deleteMany({});
    await prisma.transaction.deleteMany({});
    // Reset mocks if necessary, e.g., clear mock calls
    jest.clearAllMocks();
    // Ensure createTransactionInternal uses the real implementation for setup
    mockTransactionCore.createTransactionInternal.mockImplementation(actualTransactionCore.createTransactionInternal);
  });

  test('Scenario 1: Successful Match & Validation (Phase 1 behavior)', async () => {
    // 1. Manually create an initial transaction with an EXPECTED entry
    const orderIdSuccess = 'order_123_success_manual';
    const originalTransaction = await prisma.transaction.create({
      data: {
        merchant_id: merchant.merchant_id,
        status: TransactionStatus.EXPECTED, // Contains an expected entry
        logical_transaction_id: `ltid_${orderIdSuccess}`,
        entries: {
          create: [
            {
              account_id: account1.account_id,
              entry_type: EntryType.DEBIT,
              amount: new Decimal('100.00'),
              currency: 'USD',
              status: EntryStatus.POSTED,
              effective_date: new Date(),
              metadata: { order_id: orderIdSuccess, note: "Initial posted leg" },
            },
            {
              account_id: account2.account_id, // Account where we expect the fulfillment
              entry_type: EntryType.CREDIT,    // Expected entry type
              amount: new Decimal('100.00'),
              currency: 'USD',
              status: EntryStatus.EXPECTED,
              effective_date: new Date(),
              metadata: { order_id: orderIdSuccess, note: "Initial expected leg" },
            },
          ],
        },
      },
      include: { entries: true },
    });
    const expectedEntry = originalTransaction.entries.find(e => e.status === EntryStatus.EXPECTED && e.account_id === account2.account_id);
    expect(expectedEntry).toBeDefined();

    // 2. Create a new staging entry that should match this expected entry
    const fulfillingStagingEntryData = {
      account_id: account2.account_id, // Contra account
      entry_type: expectedEntry.entry_type, // Same type as expected
      amount: new Decimal('100.00'),
      currency: 'USD',
      status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,
      effective_date: new Date(),
      metadata: { order_id: orderIdSuccess }, // Use the same orderId as the manually created transaction
    };
    const fulfillingStagingEntry = await prisma.stagingEntry.create({ data: fulfillingStagingEntryData });

    // 3. Process the fulfilling staging entry
    const result = await processStagingEntryWithRecon(fulfillingStagingEntry, merchant.merchant_id);

    // Assertions for Phase 1
    // Assertions for Phase 2 Fulfillment
    expect(result).toBeDefined();
    expect(result.status).toBe(TransactionStatus.POSTED);
    expect(result.logical_transaction_id).toBe(originalTransaction.logical_transaction_id);
    expect(result.version).toBe(originalTransaction.version + 1);
    expect(result.metadata.evolved_from_transaction_id).toBe(originalTransaction.transaction_id);
    expect(result.metadata.fulfilled_expected_entry_id).toBe(expectedEntry.entry_id);

    // Verify the new transaction has two POSTED entries
    const newEntries = await prisma.entry.findMany({ where: { transaction_id: result.transaction_id } });
    expect(newEntries).toHaveLength(2);
    expect(newEntries.every(e => e.status === EntryStatus.POSTED)).toBe(true);

    // Verify one entry comes from the staging entry
    const fulfillingEntryInNewTx = newEntries.find(e => e.metadata.source_staging_entry_id === fulfillingStagingEntry.staging_entry_id);
    expect(fulfillingEntryInNewTx).toBeDefined();
    expect(fulfillingEntryInNewTx.account_id).toBe(fulfillingStagingEntryData.account_id);
    expect(fulfillingEntryInNewTx.amount.toFixed(2)).toBe(fulfillingStagingEntryData.amount.toFixed(2));
    expect(fulfillingEntryInNewTx.entry_type).toBe(fulfillingStagingEntryData.entry_type);

    // Verify the other entry is the carried-over posted leg
    const originalPostedEntry = originalTransaction.entries.find(e => e.status === EntryStatus.POSTED);
    const carriedOverEntryInNewTx = newEntries.find(e => e.metadata.derived_from_entry_id === originalPostedEntry.entry_id);
    expect(carriedOverEntryInNewTx).toBeDefined();
    expect(carriedOverEntryInNewTx.account_id).toBe(originalPostedEntry.account_id);
    expect(carriedOverEntryInNewTx.amount.toFixed(2)).toBe(originalPostedEntry.amount.toFixed(2));
    expect(carriedOverEntryInNewTx.entry_type).toBe(originalPostedEntry.entry_type);


    const updatedStagingEntry = await prisma.stagingEntry.findUnique({ where: { staging_entry_id: fulfillingStagingEntry.staging_entry_id } });
    expect(updatedStagingEntry.status).toBe(StagingEntryStatus.PROCESSED);
    expect(updatedStagingEntry.metadata.matched_transaction_id).toBe(originalTransaction.transaction_id);
    expect(updatedStagingEntry.metadata.matched_entry_id).toBe(expectedEntry.entry_id);
    expect(updatedStagingEntry.metadata.evolved_transaction_id).toBe(result.transaction_id);
    expect(updatedStagingEntry.metadata.match_type).toBe('Phase2_Fulfilled');
    expect(updatedStagingEntry.discarded_at).not.toBeNull();

    // Verify original transaction is ARCHIVED
    const archivedTransaction = await prisma.transaction.findUnique({ where: { transaction_id: originalTransaction.transaction_id } });
    expect(archivedTransaction.status).toBe(TransactionStatus.ARCHIVED);
    expect(archivedTransaction.discarded_at).not.toBeNull();

    // Verify entries of the original transaction are marked as discarded but retain their status
    const originalEntries = await prisma.entry.findMany({ where: { transaction_id: originalTransaction.transaction_id }});
    expect(originalEntries.length).toBe(2); // Assuming 2 entries per transaction
    originalEntries.forEach(entry => {
      expect(entry.discarded_at).not.toBeNull();
      expect(entry.status).toBe(EntryStatus.ARCHIVED); // Verify status is ARCHIVED
    });
    
    // Specifically check the original expected entry's status and discarded_at
    const originalExpectedEntryArchived = originalEntries.find(e => e.entry_id === expectedEntry.entry_id);
    expect(originalExpectedEntryArchived.status).toBe(EntryStatus.ARCHIVED); // Status is ARCHIVED
    expect(originalExpectedEntryArchived.discarded_at).not.toBeNull();

    // Specifically check the original posted entry's status and discarded_at
    const originalPostedEntryArchived = originalEntries.find(e => e.entry_id === originalPostedEntry.entry_id);
    expect(originalPostedEntryArchived.status).toBe(EntryStatus.ARCHIVED); // Status is ARCHIVED
    expect(originalPostedEntryArchived.discarded_at).not.toBeNull();
  });

  test('Scenario 2: Mismatch (Amount Differs)', async () => {
    // 1. Manually create an initial transaction with an EXPECTED entry
    const orderIdMismatchAmount = 'order_mismatch_amount_manual';
    const originalTransaction = await prisma.transaction.create({
      data: {
        merchant_id: merchant.merchant_id,
        status: TransactionStatus.EXPECTED,
        logical_transaction_id: `ltid_${orderIdMismatchAmount}`,
        entries: {
          create: [
            { account_id: account1.account_id, entry_type: EntryType.DEBIT, amount: new Decimal('100.00'), currency: 'USD', status: EntryStatus.POSTED, effective_date: new Date(), metadata: { order_id: orderIdMismatchAmount } },
            { account_id: account2.account_id, entry_type: EntryType.CREDIT, amount: new Decimal('100.00'), currency: 'USD', status: EntryStatus.EXPECTED, effective_date: new Date(), metadata: { order_id: orderIdMismatchAmount } },
          ],
        },
      },
      include: { entries: true },
    });
    const expectedEntry = originalTransaction.entries.find(e => e.status === EntryStatus.EXPECTED && e.account_id === account2.account_id);
    expect(expectedEntry).toBeDefined();

    // 2. Create a staging entry that mismatches this expected entry
    const mismatchStagingEntryData = {
      account_id: account2.account_id,
      entry_type: expectedEntry.entry_type,
      amount: new Decimal('99.00'), // Different amount
      currency: 'USD',
      status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,
      effective_date: new Date(),
      metadata: { order_id: orderIdMismatchAmount },
    };
    const mismatchStagingEntry = await prisma.stagingEntry.create({ data: mismatchStagingEntryData });

    await expect(processStagingEntryWithRecon(mismatchStagingEntry, merchant.merchant_id))
      .rejects
      .toThrow(`Mismatch detected for staging_entry_id ${mismatchStagingEntry.staging_entry_id}: Amount mismatch: staging 99.00, expected 100.00`);

    const updatedStagingEntry = await prisma.stagingEntry.findUnique({ where: { staging_entry_id: mismatchStagingEntry.staging_entry_id } });
    expect(updatedStagingEntry.status).toBe(StagingEntryStatus.NEEDS_MANUAL_REVIEW);
    expect(updatedStagingEntry.metadata.error_type).toBe('MismatchError');
    expect(updatedStagingEntry.metadata.matched_transaction_id).toBe(originalTransaction.transaction_id);
    expect(updatedStagingEntry.discarded_at).toBeNull(); // Should not be discarded

    const updatedOriginalTransaction = await prisma.transaction.findUnique({ where: { transaction_id: originalTransaction.transaction_id } });
    expect(updatedOriginalTransaction.status).toBe(TransactionStatus.MISMATCH);
  });
  
  test('Scenario 2b: Mismatch (Currency Differs)', async () => {
    // 1. Manually create an initial transaction with an EXPECTED entry
    const orderIdMismatchCurrency = 'order_mismatch_currency_manual';
    const originalTransaction = await prisma.transaction.create({
      data: {
        merchant_id: merchant.merchant_id,
        status: TransactionStatus.EXPECTED,
        logical_transaction_id: `ltid_${orderIdMismatchCurrency}`,
        entries: {
          create: [
            { account_id: account1.account_id, entry_type: EntryType.DEBIT, amount: new Decimal('100.00'), currency: 'USD', status: EntryStatus.POSTED, effective_date: new Date(), metadata: { order_id: orderIdMismatchCurrency } },
            { account_id: account2.account_id, entry_type: EntryType.CREDIT, amount: new Decimal('100.00'), currency: 'USD', status: EntryStatus.EXPECTED, effective_date: new Date(), metadata: { order_id: orderIdMismatchCurrency } },
          ],
        },
      },
      include: { entries: true },
    });
    const expectedEntry = originalTransaction.entries.find(e => e.status === EntryStatus.EXPECTED && e.account_id === account2.account_id);
    expect(expectedEntry).toBeDefined();

    // 2. Create a staging entry that mismatches this expected entry
    const mismatchStagingEntryData = {
      account_id: account2.account_id,
      entry_type: expectedEntry.entry_type,
      amount: new Decimal('100.00'),
      currency: 'EUR', // Different currency
      status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,
      effective_date: new Date(),
      metadata: { order_id: orderIdMismatchCurrency },
    };
    const mismatchStagingEntry = await prisma.stagingEntry.create({ data: mismatchStagingEntryData });

    await expect(processStagingEntryWithRecon(mismatchStagingEntry, merchant.merchant_id))
      .rejects
      .toThrow(`Mismatch detected for staging_entry_id ${mismatchStagingEntry.staging_entry_id}: Currency mismatch: staging EUR, expected USD`);
    
    const updatedStagingEntry = await prisma.stagingEntry.findUnique({ where: { staging_entry_id: mismatchStagingEntry.staging_entry_id } });
    expect(updatedStagingEntry.status).toBe(StagingEntryStatus.NEEDS_MANUAL_REVIEW);
    expect(updatedStagingEntry.metadata.error_type).toBe('MismatchError');
    expect(updatedStagingEntry.discarded_at).toBeNull(); // Should not be discarded

    const updatedOriginalTransaction = await prisma.transaction.findUnique({ where: { transaction_id: originalTransaction.transaction_id } });
    expect(updatedOriginalTransaction.status).toBe(TransactionStatus.MISMATCH);
  });

  test('Scenario 2c: Mismatch (Entry Type Differs)', async () => {
    // 1. Manually create an initial transaction with an EXPECTED entry
    const orderIdMismatchType = 'order_mismatch_type_manual';
    const originalTransaction = await prisma.transaction.create({
      data: {
        merchant_id: merchant.merchant_id,
        status: TransactionStatus.EXPECTED,
        logical_transaction_id: `ltid_${orderIdMismatchType}`,
        entries: {
          create: [
            { account_id: account1.account_id, entry_type: EntryType.DEBIT, amount: new Decimal('100.00'), currency: 'USD', status: EntryStatus.POSTED, effective_date: new Date(), metadata: { order_id: orderIdMismatchType } },
            { account_id: account2.account_id, entry_type: EntryType.CREDIT, amount: new Decimal('100.00'), currency: 'USD', status: EntryStatus.EXPECTED, effective_date: new Date(), metadata: { order_id: orderIdMismatchType } },
          ],
        },
      },
      include: { entries: true },
    });
    const expectedEntry = originalTransaction.entries.find(e => e.status === EntryStatus.EXPECTED && e.account_id === account2.account_id);
    expect(expectedEntry).toBeDefined();
    expect(expectedEntry.entry_type).toBe(EntryType.CREDIT);

    // 2. Create a staging entry that mismatches this expected entry
    const mismatchStagingEntryData = {
      account_id: account2.account_id,
      entry_type: EntryType.DEBIT, // Should be CREDIT to match the expected entry
      amount: new Decimal('100.00'),
      currency: 'USD',
      status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,
      effective_date: new Date(),
      metadata: { order_id: orderIdMismatchType },
    };
    const mismatchStagingEntry = await prisma.stagingEntry.create({ data: mismatchStagingEntryData });

    await expect(processStagingEntryWithRecon(mismatchStagingEntry, merchant.merchant_id))
      .rejects
      .toThrow(`Mismatch detected for staging_entry_id ${mismatchStagingEntry.staging_entry_id}: Entry type mismatch: staging DEBIT, expected CREDIT`);

    const updatedStagingEntry = await prisma.stagingEntry.findUnique({ where: { staging_entry_id: mismatchStagingEntry.staging_entry_id } });
    expect(updatedStagingEntry.status).toBe(StagingEntryStatus.NEEDS_MANUAL_REVIEW);
    expect(updatedStagingEntry.metadata.error_type).toBe('MismatchError');
    expect(updatedStagingEntry.discarded_at).toBeNull(); // Should not be discarded

    const updatedOriginalTransaction = await prisma.transaction.findUnique({ where: { transaction_id: originalTransaction.transaction_id } });
    expect(updatedOriginalTransaction.status).toBe(TransactionStatus.MISMATCH);
  });

  test('Scenario 3: No Match Found (Staging Entry marked for Manual Review)', async () => {
    const stagingEntryData = {
      account_id: account1.account_id,
      entry_type: EntryType.DEBIT,
      amount: new Decimal('200.00'),
      currency: 'USD',
      status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,
      effective_date: new Date(),
      metadata: { order_id: 'order_no_match_manual_review' }, // Unique order_id for this test
    };
    const stagingEntry = await prisma.stagingEntry.create({ data: stagingEntryData });

    // "No match" should now reject and mark for manual review without discarding.
    const expectedErrorMessage = `No matching expected entry found for staging_entry_id ${stagingEntry.staging_entry_id}. Staging entry requires manual review.`;
    
    await expect(processStagingEntryWithRecon(stagingEntry, merchant.merchant_id))
      .rejects
      .toThrow(expectedErrorMessage);
    
    const updatedStagingEntry = await prisma.stagingEntry.findUnique({ where: { staging_entry_id: stagingEntry.staging_entry_id } });
    expect(updatedStagingEntry.status).toBe(StagingEntryStatus.NEEDS_MANUAL_REVIEW);
    expect(updatedStagingEntry.discarded_at).toBeNull(); // Crucially, not discarded
    expect(updatedStagingEntry.metadata.error).toBe(expectedErrorMessage);
    expect(updatedStagingEntry.metadata.error_type).toBe('NoMatchFoundError');
    expect(updatedStagingEntry.metadata.created_transaction_id).toBeUndefined(); // No new transaction
    expect(updatedStagingEntry.metadata.match_type).toBeUndefined();
  });

  test('Scenario 4: Ambiguous Match (Multiple Expected Entries)', async () => {
    const orderIdAmbiguous = 'order_ambiguous_manual';
    // Create first transaction with an EXPECTED entry
    await prisma.transaction.create({
      data: {
        merchant_id: merchant.merchant_id,
        status: TransactionStatus.EXPECTED,
        logical_transaction_id: `ltid_${orderIdAmbiguous}_1`,
        entries: {
          create: [
            { account_id: account1.account_id, entry_type: EntryType.DEBIT, amount: new Decimal('50.00'), currency: 'USD', status: EntryStatus.POSTED, effective_date: new Date(), metadata: { order_id: orderIdAmbiguous, note: "Ambiguous source 1 posted" } },
            { account_id: account2.account_id, entry_type: EntryType.CREDIT, amount: new Decimal('50.00'), currency: 'USD', status: EntryStatus.EXPECTED, effective_date: new Date(), metadata: { order_id: orderIdAmbiguous, note: "Ambiguous source 1 expected" } },
          ],
        },
      },
    });

    // Create a second transaction with another EXPECTED entry for the same order_id and account_id
    await prisma.transaction.create({
      data: {
        merchant_id: merchant.merchant_id,
        status: TransactionStatus.POSTED, 
        logical_transaction_id: `logical_${orderIdAmbiguous}_2`,
        entries: {
          create: [
            {
              account_id: account1.account_id, 
              entry_type: EntryType.DEBIT,
              amount: new Decimal('75.00'), 
              currency: 'USD',
              status: EntryStatus.POSTED,
              effective_date: new Date(),
              metadata: { order_id: orderIdAmbiguous, note: "Second source for ambiguity" },
            },
            {
              account_id: account2.account_id, // The ambiguous expected entry
              entry_type: EntryType.CREDIT,
              amount: new Decimal('75.00'),
              currency: 'USD',
              status: EntryStatus.EXPECTED,
              effective_date: new Date(),
              metadata: { order_id: orderIdAmbiguous, source_staging_entry_id: 'manual_ambiguous_source_2' },
            },
          ],
        },
      },
    });


    const fulfillingStagingEntryData = {
      account_id: account2.account_id, // Target account for the expected entries
      entry_type: EntryType.CREDIT,
      amount: new Decimal('50.00'), // Matches the first one
      currency: 'USD',
      status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,
      effective_date: new Date(),
      metadata: { order_id: orderIdAmbiguous }, // Use the same orderId
    };
    const fulfillingStagingEntry = await prisma.stagingEntry.create({ data: fulfillingStagingEntryData });

    await expect(processStagingEntryWithRecon(fulfillingStagingEntry, merchant.merchant_id))
      .rejects
      .toThrow(`Ambiguous match for staging_entry_id ${fulfillingStagingEntry.staging_entry_id}: Multiple expected entries found.`);

    const updatedStagingEntry = await prisma.stagingEntry.findUnique({ where: { staging_entry_id: fulfillingStagingEntry.staging_entry_id } });
    expect(updatedStagingEntry.status).toBe(StagingEntryStatus.NEEDS_MANUAL_REVIEW);
    expect(updatedStagingEntry.metadata.error_type).toBe('AmbiguousMatchError');
    expect(updatedStagingEntry.discarded_at).toBeNull(); // Should not be discarded
  });

});
