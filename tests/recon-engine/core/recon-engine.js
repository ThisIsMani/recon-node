// tests/recon-engine/core/engine.test.js

const { generateTransactionEntriesFromStaging, NoReconRuleFoundError, processStagingEntryWithRecon } = require('../../../src/server/core/recon-engine/engine');
const prisma = require('../../../src/services/prisma');
const transactionCore = require('../../../src/server/core/transaction');
const { BalanceError } = require('../../../src/server/core/transaction');
const { EntryStatus, EntryType, StagingEntryStatus, TransactionStatus } = require('@prisma/client');

// Mock Prisma
jest.mock('../../../src/services/prisma', () => ({
  reconRule: {
    findFirst: jest.fn(),
  },
  stagingEntry: { 
    update: jest.fn(),
  },
  entry: { // Added mock for prisma.entry
    findMany: jest.fn(),
  },
  // Mock for $transaction to provide a mock transaction client to the callback
  $transaction: jest.fn(async (callback) => {
    // The callback expects a prisma client-like object (the transaction client 'tx')
    // We can pass a simplified mock or even the original mocked prisma for nested calls if needed by the callback's logic
    // For simplicity, let's pass an object that has the methods used within the transaction callback in engine.js
    const mockTx = {
      transaction: { // Assuming tx.transaction.update is used
        update: jest.fn().mockResolvedValue({}),
      },
      stagingEntry: { // Assuming tx.stagingEntry.update is used
        update: jest.fn().mockResolvedValue({}),
      },
      // Add other prisma client methods if they are used within the $transaction callback in engine.js
    };
    return callback(mockTx);
  }),
}));

// Mock transactionCore
jest.mock('../../../src/server/core/transaction', () => ({
  createTransactionInternal: jest.fn(),
  BalanceError: class BalanceError extends Error { constructor(message) { super(message); this.name = 'BalanceError'; } },
}));


describe('Recon Engine Core Logic - generateTransactionEntriesFromStaging', () => {
  let mockStagingEntry;
  const merchantId = 'merchant-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockStagingEntry = {
      staging_entry_id: 'staging-abc',
      account_id: 'account-from',
      entry_type: EntryType.DEBIT,
      amount: 100.00,
      currency: 'USD',
      effective_date: new Date('2025-05-20T00:00:00.000Z'),
      metadata: {
        order_id: 'order-xyz',
        notes: 'Initial payment',
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should generate actual and expected entries when a recon rule is found', async () => {
    const mockRule = {
      id: 'rule-1',
      merchant_id: merchantId,
      account_one_id: 'account-from',
      account_two_id: 'account-to',
    };
    prisma.reconRule.findFirst.mockResolvedValue(mockRule);

    const result = await generateTransactionEntriesFromStaging(mockStagingEntry, merchantId);

    expect(result).toHaveLength(2);
    const [actualEntry, expectedEntry] = result;

    // Actual Entry Checks
    expect(actualEntry.account_id).toBe(mockStagingEntry.account_id);
    expect(actualEntry.entry_type).toBe(mockStagingEntry.entry_type);
    expect(actualEntry.amount).toBe(mockStagingEntry.amount);
    expect(actualEntry.currency).toBe(mockStagingEntry.currency);
    expect(actualEntry.status).toBe(EntryStatus.POSTED);
    expect(actualEntry.effective_date).toBe(mockStagingEntry.effective_date);
    expect(actualEntry.metadata).toEqual({
      ...mockStagingEntry.metadata,
      order_id: 'order-xyz',
      source_staging_entry_id: 'staging-abc',
    });

    // Expected Entry Checks
    expect(expectedEntry.account_id).toBe('account-to');
    expect(expectedEntry.entry_type).toBe(EntryType.CREDIT); // Opposite of DEBIT
    expect(expectedEntry.amount).toBe(mockStagingEntry.amount);
    expect(expectedEntry.currency).toBe(mockStagingEntry.currency);
    expect(expectedEntry.status).toBe(EntryStatus.EXPECTED);
    expect(expectedEntry.effective_date).toBe(mockStagingEntry.effective_date);
    expect(expectedEntry.metadata).toEqual({
      order_id: 'order-xyz',
      source_staging_entry_id: 'staging-abc',
      recon_rule_id: 'rule-1',
    });

    expect(prisma.reconRule.findFirst).toHaveBeenCalledWith({
      where: {
        merchant_id: merchantId,
        OR: [
          { account_one_id: mockStagingEntry.account_id },
          { account_two_id: mockStagingEntry.account_id },
        ],
      },
    });
  });

  test('should throw NoReconRuleFoundError if no recon rule is found', async () => {
    prisma.reconRule.findFirst.mockResolvedValue(null);

    await expect(
      generateTransactionEntriesFromStaging(mockStagingEntry, merchantId)
    ).rejects.toThrow(NoReconRuleFoundError);
    await expect(
      generateTransactionEntriesFromStaging(mockStagingEntry, merchantId)
    ).rejects.toThrow(`No reconciliation rule found for merchant ${merchantId} and account ${mockStagingEntry.account_id}`);
  });

  test('should handle staging entry with no order_id in metadata', async () => {
    const mockRule = { id: 'rule-2', account_one_id: 'account-from', account_two_id: 'account-to-alt' };
    prisma.reconRule.findFirst.mockResolvedValue(mockRule);
    const stagingEntryNoOrderId = { ...mockStagingEntry, metadata: { notes: 'Some notes' } };

    const [actualEntry, expectedEntry] = await generateTransactionEntriesFromStaging(stagingEntryNoOrderId, merchantId);

    expect(actualEntry.metadata.order_id).toBeUndefined();
    expect(expectedEntry.metadata.order_id).toBeUndefined();
  });
  
  test('should handle staging entry with null metadata', async () => {
    const mockRule = { id: 'rule-3', account_one_id: 'account-from', account_two_id: 'account-to-alt2' };
    prisma.reconRule.findFirst.mockResolvedValue(mockRule);
    const stagingEntryNullMeta = { ...mockStagingEntry, metadata: null };

    const [actualEntry, expectedEntry] = await generateTransactionEntriesFromStaging(stagingEntryNullMeta, merchantId);
    
    expect(actualEntry.metadata.order_id).toBeUndefined();
    expect(actualEntry.metadata.source_staging_entry_id).toBe(stagingEntryNullMeta.staging_entry_id);
    expect(expectedEntry.metadata.order_id).toBeUndefined();
    expect(expectedEntry.metadata.source_staging_entry_id).toBe(stagingEntryNullMeta.staging_entry_id);
  });

  test('should correctly determine expected entry type for CREDIT staging entry', async () => {
    const mockRule = { id: 'rule-4', account_one_id: 'account-from', account_two_id: 'account-to-credit' };
    prisma.reconRule.findFirst.mockResolvedValue(mockRule);
    const creditStagingEntry = { ...mockStagingEntry, entry_type: EntryType.CREDIT };

    const [, expectedEntry] = await generateTransactionEntriesFromStaging(creditStagingEntry, merchantId);
    expect(expectedEntry.entry_type).toBe(EntryType.DEBIT);
  });

  test('should use account_one_id as contra_account if stagingEntry.account_id matches rule.account_two_id', async () => {
    const mockRule = {
      id: 'rule-5',
      merchant_id: merchantId,
      account_one_id: 'account-other', // This should be the contra account
      account_two_id: 'account-from',   // This matches stagingEntry.account_id
    };
    prisma.reconRule.findFirst.mockResolvedValue(mockRule);
  
    const [, expectedEntry] = await generateTransactionEntriesFromStaging(mockStagingEntry, merchantId);
  
    expect(expectedEntry.account_id).toBe('account-other');
  });
});

describe('Recon Engine Core Logic - processStagingEntryWithRecon', () => {
  let mockStagingEntry;
  const merchantId = 'merchant-789';
  const mockTransactionId = 'txn-generated-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockStagingEntry = {
      staging_entry_id: 'staging-xyz-789',
      account_id: 'account-main',
      entry_type: EntryType.DEBIT,
      amount: 200.00,
      currency: 'EUR',
      effective_date: new Date('2025-06-01T00:00:00.000Z'),
      metadata: { payment_ref: 'pay-abc' },
      // account: { merchant_id: merchantId } // This would typically be included if fetched by consumer
    };

    // Default successful mock for generateTransactionEntriesFromStaging (indirectly via reconRule mock)
    prisma.reconRule.findFirst.mockResolvedValue({
      id: 'rule-xyz',
      merchant_id: merchantId,
      account_one_id: 'account-main',
      account_two_id: 'account-contra',
    });

    // Default successful mock for createTransactionInternal
    transactionCore.createTransactionInternal.mockResolvedValue({
      transaction_id: mockTransactionId,
      status: TransactionStatus.POSTED,
      entries: [{}, {}], // Simplified
    });

    // Default successful mock for prisma.stagingEntry.update
    prisma.stagingEntry.update.mockResolvedValue({
      ...mockStagingEntry,
      status: StagingEntryStatus.PROCESSED,
    });
    // For tests in this suite that go through processStagingEntryWithRecon,
    // assume no existing expected entries are found by default, unless overridden in a specific test.
    prisma.entry.findMany.mockResolvedValue([]); 
  });

  afterEach(() => {
    // Ensure all spies are restored after each test
    jest.restoreAllMocks();
  });

  afterEach(() => {
    // Ensure all spies are restored after each test
    jest.restoreAllMocks();
  });

  test('should successfully process a staging entry, create transaction, and update staging entry status', async () => {
    // const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Removed
    const result = await processStagingEntryWithRecon(mockStagingEntry, merchantId);

    expect(prisma.reconRule.findFirst).toHaveBeenCalledTimes(1);
    expect(transactionCore.createTransactionInternal).toHaveBeenCalledTimes(1);
    const createTransactionArgs = transactionCore.createTransactionInternal.mock.calls[0];
    expect(createTransactionArgs[0].merchant_id).toBe(merchantId);
    expect(createTransactionArgs[0].status).toBe(TransactionStatus.POSTED);
    expect(createTransactionArgs[0].metadata).toEqual({ ...mockStagingEntry.metadata, source_staging_entry_id: mockStagingEntry.staging_entry_id });
    expect(createTransactionArgs[1].status).toBe(EntryStatus.POSTED); // actualEntryData
    expect(createTransactionArgs[2].status).toBe(EntryStatus.EXPECTED); // expectedEntryData

    expect(prisma.stagingEntry.update).toHaveBeenCalledWith({
      where: { staging_entry_id: mockStagingEntry.staging_entry_id },
      data: { status: StagingEntryStatus.PROCESSED, discarded_at: expect.any(Date) },
    });
    expect(result.transaction_id).toBe(mockTransactionId);
    // expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(`Successfully processed staging_entry_id: ${mockStagingEntry.staging_entry_id}`)); // Removed
    // consoleLogSpy.mockRestore(); // Removed
  });

  test('should handle NoReconRuleFoundError, update staging entry, and re-throw', async () => {
    prisma.reconRule.findFirst.mockResolvedValue(null); // Simulate no rule found
    // const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // Removed
    // const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Removed

    await expect(processStagingEntryWithRecon(mockStagingEntry, merchantId)).rejects.toThrow(NoReconRuleFoundError);

    expect(transactionCore.createTransactionInternal).not.toHaveBeenCalled();
    expect(prisma.stagingEntry.update).toHaveBeenCalledWith({
      where: { staging_entry_id: mockStagingEntry.staging_entry_id },
      data: { 
        status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,
        discarded_at: expect.any(Date),
        metadata: { 
          ...mockStagingEntry.metadata, 
          error: `No reconciliation rule found for merchant ${merchantId} and account ${mockStagingEntry.account_id}`,
          error_type: 'NoReconRuleFoundError'
        }
      },
    });
    // consoleErrorSpy.mockRestore(); // Removed
    // consoleLogSpy.mockRestore(); // Removed
  });

  test('should handle BalanceError from createTransactionInternal, update staging entry, and re-throw', async () => {
    const balanceErrorMessage = 'Amounts do not balance';
    transactionCore.createTransactionInternal.mockRejectedValue(new BalanceError(balanceErrorMessage));
    // const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // Removed
    // const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Removed

    // We expect two calls because the test runs the function twice for different assertions
    // This is not ideal, let's refactor the test to call it once and check both throw types.
    try {
      await processStagingEntryWithRecon(mockStagingEntry, merchantId);
    } catch (e) {
      expect(e).toBeInstanceOf(BalanceError);
      expect(e.message).toBe(balanceErrorMessage);
    }


    expect(prisma.stagingEntry.update).toHaveBeenCalledTimes(1); 
    expect(prisma.stagingEntry.update).toHaveBeenCalledWith({
      where: { staging_entry_id: mockStagingEntry.staging_entry_id },
      data: { 
        status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,
        discarded_at: expect.any(Date),
        metadata: {
           ...mockStagingEntry.metadata, 
           error: balanceErrorMessage,
           error_type: 'BalanceError'
        }
      },
    });
    // consoleErrorSpy.mockRestore(); // Removed
    // consoleLogSpy.mockRestore(); // Removed
  });

  test('should handle generic error from generateTransactionEntriesFromStaging, update staging entry, and re-throw', async () => {
    const genericErrorMessage = 'Generic findFirst error';
    prisma.reconRule.findFirst.mockRejectedValue(new Error(genericErrorMessage));
    // const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // Removed
    // const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Removed

    await expect(processStagingEntryWithRecon(mockStagingEntry, merchantId)).rejects.toThrow(genericErrorMessage);

    expect(transactionCore.createTransactionInternal).not.toHaveBeenCalled();
    expect(prisma.stagingEntry.update).toHaveBeenCalledWith({
      where: { staging_entry_id: mockStagingEntry.staging_entry_id },
      data: { 
        status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,
        discarded_at: expect.any(Date),
        metadata: {
          ...mockStagingEntry.metadata, 
          error: genericErrorMessage,
          error_type: 'Error' // Corrected from 'GenericError'
        }
      },
    });
    // consoleErrorSpy.mockRestore(); // Removed
    // consoleLogSpy.mockRestore(); // Removed
  });
  
  test('should handle generic error from createTransactionInternal, update staging entry, and re-throw', async () => {
    const genericErrorMessage = 'Generic createTransactionInternal error';
    transactionCore.createTransactionInternal.mockRejectedValue(new Error(genericErrorMessage));
    // const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // Removed
    // const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Removed

    await expect(processStagingEntryWithRecon(mockStagingEntry, merchantId)).rejects.toThrow(genericErrorMessage);

    expect(prisma.stagingEntry.update).toHaveBeenCalledWith({
      where: { staging_entry_id: mockStagingEntry.staging_entry_id },
      data: { 
        status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,
        discarded_at: expect.any(Date),
        metadata: {
          ...mockStagingEntry.metadata, 
          error: genericErrorMessage,
          error_type: 'Error' // Corrected from 'GenericError'
        }
      },
    });
    // consoleErrorSpy.mockRestore(); // Removed
    // consoleLogSpy.mockRestore(); // Removed
  });

  test('should throw error if stagingEntry is invalid', async () => {
    await expect(processStagingEntryWithRecon(null, merchantId)).rejects.toThrow('Invalid stagingEntry object provided to processStagingEntryWithRecon.');
    await expect(processStagingEntryWithRecon({}, merchantId)).rejects.toThrow('Invalid stagingEntry object provided to processStagingEntryWithRecon.');
  });

  test('should throw error if merchantId is invalid', async () => {
    await expect(processStagingEntryWithRecon(mockStagingEntry, null)).rejects.toThrow('Invalid merchantId provided to processStagingEntryWithRecon.');
  });

  test('should correctly pass metadata to createTransactionInternal', async () => {
    const stagingEntryWithSpecificMeta = {
      ...mockStagingEntry,
      metadata: { custom_field: 'custom_value', order_id: 'order-123' }
    };
    // const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Removed
    await processStagingEntryWithRecon(stagingEntryWithSpecificMeta, merchantId);
    
    expect(transactionCore.createTransactionInternal).toHaveBeenCalled();
    const args = transactionCore.createTransactionInternal.mock.calls[0];
    expect(args[0].metadata).toEqual({
      custom_field: 'custom_value',
      order_id: 'order-123',
      source_staging_entry_id: stagingEntryWithSpecificMeta.staging_entry_id
    });
    // consoleLogSpy.mockRestore(); // Removed
  });
});
