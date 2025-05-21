// tests/recon-engine/core/engine.test.js

const { generateTransactionEntriesFromStaging, NoReconRuleFoundError, processStagingEntryWithRecon } = require('../../../src/server/core/recon-engine/engine');
const prisma = require('../../../src/services/prisma');
const transactionCore = require('../../../src/server/core/transaction');
const { BalanceError } = require('../../../src/server/core/transaction');
const { EntryStatus, EntryType, StagingEntryStatus, TransactionStatus } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library'); // Import Decimal

// Mock Prisma
jest.mock('../../../src/services/prisma', () => ({
  reconRule: {
    findFirst: jest.fn(),
  },
  stagingEntry: { 
    update: jest.fn(),
  },
  entry: { 
    findMany: jest.fn(),
    // Add other methods if used by the SUT during tests, e.g., updateMany for fulfillment
    updateMany: jest.fn().mockResolvedValue({ count: 0 }), 
  },
  $transaction: jest.fn(async (callback) => {
    const mockTx = {
      transaction: { 
        update: jest.fn().mockResolvedValue({}),
      },
      stagingEntry: { 
        update: jest.fn().mockResolvedValue({}),
      },
      entry: { // Ensure entry operations within a transaction are mocked
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      }
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
      amount: new Decimal('100.00'), // Use Decimal
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

    expect(actualEntry.amount).toBeInstanceOf(Decimal);
    expect(expectedEntry.amount).toBeInstanceOf(Decimal);
    expect(actualEntry.amount.equals(mockStagingEntry.amount)).toBe(true);
    expect(expectedEntry.amount.equals(mockStagingEntry.amount)).toBe(true);
  });

  test('should throw NoReconRuleFoundError if no recon rule is found', async () => {
    prisma.reconRule.findFirst.mockResolvedValue(null);
    await expect(
      generateTransactionEntriesFromStaging(mockStagingEntry, merchantId)
    ).rejects.toThrow(NoReconRuleFoundError);
  });
});

describe('Recon Engine Core Logic - processStagingEntryWithRecon', () => {
  let mockStagingEntry;
  const merchantId = 'merchant-789';

  beforeEach(() => {
    jest.clearAllMocks();
    mockStagingEntry = {
      staging_entry_id: 'staging-xyz-789',
      account_id: 'account-main',
      entry_type: EntryType.DEBIT,
      amount: new Decimal('200.00'), // Use Decimal
      currency: 'EUR',
      effective_date: new Date('2025-06-01T00:00:00.000Z'),
      metadata: { payment_ref: 'pay-abc' },
    };
    prisma.entry.findMany.mockResolvedValue([]); // Default to no match
    prisma.stagingEntry.update.mockResolvedValue({});
    transactionCore.createTransactionInternal.mockResolvedValue({ transaction_id: 'new_txn_id', entries: [] });
     // Reset $transaction mock to ensure it provides the nested mocks for each call
    prisma.$transaction.mockImplementation(async (callback) => {
      const mockTx = {
        transaction: { update: jest.fn().mockResolvedValue({}) },
        stagingEntry: { update: jest.fn().mockResolvedValue({}) },
        entry: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) }
      };
      return callback(mockTx);
    });
  });

  test('should handle "No Match Found" by setting status to NEEDS_MANUAL_REVIEW and throwing NoMatchFoundError', async () => {
    const expectedErrorMessage = `No matching expected entry found for staging_entry_id ${mockStagingEntry.staging_entry_id}. Staging entry requires manual review.`;
    await expect(processStagingEntryWithRecon(mockStagingEntry, merchantId))
      .rejects
      .toThrow(expectedErrorMessage);
    expect(prisma.stagingEntry.update).toHaveBeenCalledWith({
      where: { staging_entry_id: mockStagingEntry.staging_entry_id },
      data: {
        status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,
        metadata: expect.objectContaining({ error: expectedErrorMessage, error_type: 'NoMatchFoundError' }),
      },
    });
    const updateCallData = prisma.stagingEntry.update.mock.calls[0][0].data;
    expect(updateCallData.discarded_at).toBeUndefined();
  });

  test('should handle BalanceError from createTransactionInternal during fulfillment, update staging entry (no discard), and re-throw', async () => {
    const orderId = 'order_balance_error_fulfill';
    const mockOriginalTransaction = {
      transaction_id: 'orig_txn_balance_error',
      logical_transaction_id: `ltid_${orderId}`,
      version: 1,
      merchant_id: merchantId,
      status: TransactionStatus.EXPECTED,
      entries: [
        { entry_id: 'orig_entry_posted', account_id: 'account-other', entry_type: EntryType.DEBIT, amount: new Decimal('200.00'), currency: 'EUR', status: EntryStatus.POSTED, metadata: { order_id: orderId } },
        { entry_id: 'orig_entry_expected', account_id: mockStagingEntry.account_id, entry_type: mockStagingEntry.entry_type, amount: new Decimal('200.00'), currency: mockStagingEntry.currency, status: EntryStatus.EXPECTED, metadata: { order_id: orderId } },
      ],
    };
    prisma.entry.findMany.mockResolvedValueOnce([{ ...mockOriginalTransaction.entries[1], transaction: mockOriginalTransaction }]);
    
    const balanceErrorMessage = 'Amounts do not balance during fulfillment';
    transactionCore.createTransactionInternal.mockRejectedValueOnce(new BalanceError(balanceErrorMessage));
    
    mockStagingEntry.metadata.order_id = orderId;

    await expect(processStagingEntryWithRecon(mockStagingEntry, merchantId)).rejects.toThrow(BalanceError);
    
    expect(prisma.stagingEntry.update).toHaveBeenCalledWith({
      where: { staging_entry_id: mockStagingEntry.staging_entry_id },
      data: { 
        status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,
        metadata: expect.objectContaining({ error: balanceErrorMessage, error_type: 'BalanceError' })
      },
    });
    const updateCallData = prisma.stagingEntry.update.mock.calls[0][0].data;
    expect(updateCallData.discarded_at).toBeUndefined();
  });
  
  test('should handle generic error from createTransactionInternal during fulfillment, update staging entry (no discard), and re-throw', async () => {
    const orderId = 'order_generic_error_fulfill';
    const mockOriginalTransaction = {
      transaction_id: 'orig_txn_generic_error',
      logical_transaction_id: `ltid_${orderId}`,
      version: 1,
      merchant_id: merchantId,
      status: TransactionStatus.EXPECTED,
      entries: [
        { entry_id: 'orig_entry_posted_g', account_id: 'account-other', entry_type: EntryType.DEBIT, amount: new Decimal('200.00'), currency: 'EUR', status: EntryStatus.POSTED, metadata: { order_id: orderId } },
        { entry_id: 'orig_entry_expected_g', account_id: mockStagingEntry.account_id, entry_type: mockStagingEntry.entry_type, amount: new Decimal('200.00'), currency: mockStagingEntry.currency, status: EntryStatus.EXPECTED, metadata: { order_id: orderId } },
      ],
    };
    prisma.entry.findMany.mockResolvedValueOnce([{ ...mockOriginalTransaction.entries[1], transaction: mockOriginalTransaction }]);
    
    const genericErrorMessage = 'Generic createTransactionInternal error during fulfillment';
    transactionCore.createTransactionInternal.mockRejectedValueOnce(new Error(genericErrorMessage));
    mockStagingEntry.metadata.order_id = orderId;

    await expect(processStagingEntryWithRecon(mockStagingEntry, merchantId)).rejects.toThrow(genericErrorMessage);

    expect(prisma.stagingEntry.update).toHaveBeenCalledWith({
      where: { staging_entry_id: mockStagingEntry.staging_entry_id },
      data: { 
        status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,
        metadata: expect.objectContaining({ error: genericErrorMessage, error_type: 'Error' })
      },
    });
    const updateCallData = prisma.stagingEntry.update.mock.calls[0][0].data;
    expect(updateCallData.discarded_at).toBeUndefined();
  });

  test('should throw error if stagingEntry is invalid', async () => {
    await expect(processStagingEntryWithRecon(null, merchantId)).rejects.toThrow('Invalid stagingEntry object provided to processStagingEntryWithRecon.');
    await expect(processStagingEntryWithRecon({}, merchantId)).rejects.toThrow('Invalid stagingEntry object provided to processStagingEntryWithRecon.');
  });

  test('should throw error if merchantId is invalid', async () => {
    await expect(processStagingEntryWithRecon(mockStagingEntry, null)).rejects.toThrow('Invalid merchantId provided to processStagingEntryWithRecon.');
  });
  
  test('should correctly pass metadata when creating an EVOLVED transaction during fulfillment', async () => {
    const orderId = 'order_metadata_fulfill';
    const originalTxId = 'orig_txn_meta';
    const expectedEntryId = 'orig_expected_entry_meta';

    const mockOriginalTransaction = {
      transaction_id: originalTxId,
      logical_transaction_id: `ltid_${orderId}`,
      version: 1,
      merchant_id: merchantId,
      status: TransactionStatus.EXPECTED,
      entries: [
        { entry_id: 'orig_posted_meta', account_id: 'account-other', entry_type: EntryType.DEBIT, amount: new Decimal('200.00'), currency: 'EUR', status: EntryStatus.POSTED, metadata: { order_id: orderId, original_note: "posted leg" } },
        { entry_id: expectedEntryId, account_id: mockStagingEntry.account_id, entry_type: mockStagingEntry.entry_type, amount: new Decimal('200.00'), currency: mockStagingEntry.currency, status: EntryStatus.EXPECTED, metadata: { order_id: orderId, original_note: "expected leg" } },
      ],
    };
    prisma.entry.findMany.mockResolvedValueOnce([{ ...mockOriginalTransaction.entries[1], transaction: mockOriginalTransaction }]);

    mockStagingEntry.metadata = { order_id: orderId, fulfilling_note: "this is the fulfillment" };
    
    const mockEvolvedTxId = 'evolved_txn_meta';
    transactionCore.createTransactionInternal.mockResolvedValueOnce({
      transaction_id: mockEvolvedTxId,
      status: TransactionStatus.POSTED,
    });

    await processStagingEntryWithRecon(mockStagingEntry, merchantId);
    
    expect(transactionCore.createTransactionInternal).toHaveBeenCalledTimes(1);
    const createEvolvedTxArgs = transactionCore.createTransactionInternal.mock.calls[0];
    
    expect(createEvolvedTxArgs[0].metadata).toEqual(
      expect.objectContaining({
        order_id: orderId, 
        fulfilling_note: "this is the fulfillment", 
        source_staging_entry_id: mockStagingEntry.staging_entry_id,
        evolved_from_transaction_id: originalTxId,
        fulfilled_expected_entry_id: expectedEntryId,
      })
    );
    expect(createEvolvedTxArgs[1].metadata).toEqual(
      expect.objectContaining({
        order_id: orderId,
        fulfilling_note: "this is the fulfillment",
        source_staging_entry_id: mockStagingEntry.staging_entry_id,
        fulfilled_expected_entry_id: expectedEntryId,
      })
    );
    expect(createEvolvedTxArgs[2].metadata).toEqual(
      expect.objectContaining({
         order_id: orderId, 
         original_note: "posted leg", 
         derived_from_entry_id: 'orig_posted_meta',
      })
    );
  });
});
