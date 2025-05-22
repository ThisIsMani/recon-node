// tests/recon-engine/core/engine.test.js

const { generateTransactionEntriesFromStaging, NoReconRuleFoundError, processStagingEntryWithRecon } = require('../../../src/server/core/recon-engine/engine');
const prisma = require('../../../src/services/prisma');
const transactionCore = require('../../../src/server/core/transaction');
const { BalanceError } = require('../../../src/server/core/transaction');
const { EntryStatus, EntryType, StagingEntryStatus, TransactionStatus, StagingEntryProcessingMode } = require('@prisma/client'); // Import StagingEntryProcessingMode
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

  // REMOVED: jest.restoreAllMocks(); from here to prevent issues with subsequent tests.
  // Mocks will be cleared by the top-level beforeEach's jest.clearAllMocks().

  test('should generate actual and expected entries when a recon rule (staging acc as account_one_id) is found', async () => {
    const mockRule = {
      id: 'rule-1',
      merchant_id: merchantId,
      account_one_id: mockStagingEntry.account_id, // Rule matches staging entry's account as account_one_id
      account_two_id: 'account-to',
    };
    // Mock to ensure findFirst is called with the correct query structure
    prisma.reconRule.findFirst.mockImplementation(async (args) => {
      if (
        args.where.merchant_id === merchantId &&
        args.where.account_one_id === mockStagingEntry.account_id
      ) {
        return mockRule;
      }
      return null;
    });

    const result = await generateTransactionEntriesFromStaging(mockStagingEntry, merchantId);

    expect(result).toHaveLength(2);
    const [actualEntry, expectedEntry] = result;

    expect(actualEntry.amount).toBeInstanceOf(Decimal);
    expect(expectedEntry.amount).toBeInstanceOf(Decimal);
    expect(actualEntry.amount.equals(mockStagingEntry.amount)).toBe(true);
    expect(expectedEntry.amount.equals(mockStagingEntry.amount)).toBe(true);
  });

  test('should throw NoReconRuleFoundError if no recon rule (staging acc as account_one_id) is found', async () => {
    prisma.reconRule.findFirst.mockResolvedValue(null); // Simulate no rule found
    const expectedErrorMessage = `No reconciliation rule found for merchant ${merchantId} where account ${mockStagingEntry.account_id} is account_one_id (for generating transaction entries)`;
    await expect(
      generateTransactionEntriesFromStaging(mockStagingEntry, merchantId)
    ).rejects.toThrow(expectedErrorMessage);
    // Also check that it's an instance of NoReconRuleFoundError
    await expect(
        generateTransactionEntriesFromStaging(mockStagingEntry, merchantId)
      ).rejects.toBeInstanceOf(NoReconRuleFoundError);
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
      processing_mode: StagingEntryProcessingMode.CONFIRMATION, // Default to CONFIRMATION for most tests here
      metadata: { payment_ref: 'pay-abc' },
    };
    prisma.entry.findMany.mockResolvedValue([]); 
    prisma.stagingEntry.update.mockResolvedValue({});
    transactionCore.createTransactionInternal.mockResolvedValue({ transaction_id: 'new_txn_id', entries: [] });
    
    // Default ReconRule mock for tests that might need it implicitly
    // Specific tests can override this or set up their own.
    prisma.reconRule.findFirst.mockResolvedValue(null); // Default to no rule found

    prisma.$transaction.mockImplementation(async (callback) => {
      const mockTx = {
        transaction: { update: jest.fn().mockResolvedValue({}) },
        stagingEntry: { update: jest.fn().mockResolvedValue({}) },
        entry: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) }
      };
      return callback(mockTx);
    });
  });

  test('should handle "No Match Found" (CONFIRMATION mode, due to no ReconRule) by setting status to NEEDS_MANUAL_REVIEW and throwing NoMatchFoundError', async () => {
    mockStagingEntry.processing_mode = StagingEntryProcessingMode.CONFIRMATION;
    prisma.reconRule.findFirst.mockResolvedValue(null); // Ensure no rule for this specific test path
    const expectedErrorMessage = `No matching expected entry found for staging_entry_id ${mockStagingEntry.staging_entry_id} (CONFIRMATION mode). Staging entry requires manual review.`;
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
    // Setup ReconRule: mockStagingEntry.account_id is account_two_id (expecting account)
    prisma.reconRule.findFirst.mockResolvedValueOnce({
      id: 'rule-for-balance-error',
      merchant_id: merchantId,
      account_one_id: 'some-other-account',
      account_two_id: mockStagingEntry.account_id,
    });

    const mockOriginalTransaction = {
      transaction_id: 'orig_txn_balance_error',
      logical_transaction_id: `ltid_${orderId}`,
      version: 1,
      merchant_id: merchantId,
      status: TransactionStatus.EXPECTED,
      entries: [
        { entry_id: 'orig_entry_posted', account_id: 'some-other-account', entry_type: EntryType.DEBIT, amount: new Decimal('200.00'), currency: 'EUR', status: EntryStatus.POSTED, effective_date: new Date(), metadata: { order_id: orderId } },
        { entry_id: 'orig_entry_expected', account_id: mockStagingEntry.account_id, entry_type: mockStagingEntry.entry_type, amount: new Decimal('200.00'), currency: mockStagingEntry.currency, status: EntryStatus.EXPECTED, effective_date: new Date(), metadata: { order_id: orderId } },
      ],
    };
    prisma.entry.findMany.mockResolvedValueOnce([{ ...mockOriginalTransaction.entries[1], transaction: mockOriginalTransaction }]);
    
    const balanceErrorMessage = 'Amounts do not balance during fulfillment';
    transactionCore.createTransactionInternal.mockRejectedValueOnce(new BalanceError(balanceErrorMessage));
    
    mockStagingEntry.metadata.order_id = orderId;
    mockStagingEntry.processing_mode = StagingEntryProcessingMode.CONFIRMATION; // Ensure mode is CONFIRMATION

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
    // Setup ReconRule: mockStagingEntry.account_id is account_two_id
    prisma.reconRule.findFirst.mockResolvedValueOnce({
      id: 'rule-for-generic-error',
      merchant_id: merchantId,
      account_one_id: 'some-other-account-g',
      account_two_id: mockStagingEntry.account_id,
    });

    const mockOriginalTransaction = {
      transaction_id: 'orig_txn_generic_error',
      logical_transaction_id: `ltid_${orderId}`,
      version: 1,
      merchant_id: merchantId,
      status: TransactionStatus.EXPECTED,
      entries: [
        { entry_id: 'orig_entry_posted_g', account_id: 'some-other-account-g', entry_type: EntryType.DEBIT, amount: new Decimal('200.00'), currency: 'EUR', status: EntryStatus.POSTED, effective_date: new Date(), metadata: { order_id: orderId } },
        { entry_id: 'orig_entry_expected_g', account_id: mockStagingEntry.account_id, entry_type: mockStagingEntry.entry_type, amount: new Decimal('200.00'), currency: mockStagingEntry.currency, status: EntryStatus.EXPECTED, effective_date: new Date(), metadata: { order_id: orderId } },
      ],
    };
    prisma.entry.findMany.mockResolvedValueOnce([{ ...mockOriginalTransaction.entries[1], transaction: mockOriginalTransaction }]);
    
    const genericErrorMessage = 'Generic createTransactionInternal error during fulfillment';
    transactionCore.createTransactionInternal.mockRejectedValueOnce(new Error(genericErrorMessage));
    mockStagingEntry.metadata.order_id = orderId;
    mockStagingEntry.processing_mode = StagingEntryProcessingMode.CONFIRMATION; // Ensure mode is CONFIRMATION

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

    // Setup ReconRule: mockStagingEntry.account_id is account_two_id
    prisma.reconRule.findFirst.mockResolvedValueOnce({
      id: 'rule-for-metadata-test',
      merchant_id: merchantId,
      account_one_id: 'some-other-account-m',
      account_two_id: mockStagingEntry.account_id,
    });

    const mockOriginalTransaction = {
      transaction_id: originalTxId,
      logical_transaction_id: `ltid_${orderId}`,
      version: 1,
      merchant_id: merchantId,
      status: TransactionStatus.EXPECTED,
      entries: [
        { entry_id: 'orig_posted_meta', account_id: 'some-other-account-m', entry_type: EntryType.DEBIT, amount: new Decimal('200.00'), currency: 'EUR', status: EntryStatus.POSTED, effective_date: new Date(), metadata: { order_id: orderId, original_note: "posted leg" } },
        { entry_id: expectedEntryId, account_id: mockStagingEntry.account_id, entry_type: mockStagingEntry.entry_type, amount: new Decimal('200.00'), currency: mockStagingEntry.currency, status: EntryStatus.EXPECTED, effective_date: new Date(), metadata: { order_id: orderId, original_note: "expected leg" } },
      ],
    };
    prisma.entry.findMany.mockResolvedValueOnce([{ ...mockOriginalTransaction.entries[1], transaction: mockOriginalTransaction }]);

    mockStagingEntry.metadata = { order_id: orderId, fulfilling_note: "this is the fulfillment" };
    mockStagingEntry.processing_mode = StagingEntryProcessingMode.CONFIRMATION; // Ensure mode is CONFIRMATION
    
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

  // Tests for TRANSACTION processing_mode
  describe('Processing Mode: TRANSACTION', () => {
    beforeEach(() => {
      mockStagingEntry.processing_mode = StagingEntryProcessingMode.TRANSACTION;
      // Aligning mockStagingEntry.metadata with observed behavior in Jest output (order_id: undefined)
      // This ensures that spreading stagingEntry.metadata will include order_id: undefined
      mockStagingEntry.metadata = { payment_ref: 'pay-abc', order_id: undefined };
    });

    test('should create a new transaction with POSTED and EXPECTED entries', async () => {
      const mockGeneratedEntries = [
        { account_id: 'acc1', entry_type: EntryType.DEBIT, amount: new Decimal('100'), status: EntryStatus.POSTED, effective_date: new Date(), metadata: { order_id: 'tx_mode_order1'} },
        { account_id: 'acc2', entry_type: EntryType.CREDIT, amount: new Decimal('100'), status: EntryStatus.EXPECTED, effective_date: new Date(), metadata: { order_id: 'tx_mode_order1'}  }
      ];
      // Mock ReconRule for generateTransactionEntriesFromStaging to find
      prisma.reconRule.findFirst.mockResolvedValueOnce({
        id: 'rule-tx-mode-success',
        merchant_id: merchantId,
        account_one_id: mockStagingEntry.account_id,
        account_two_id: 'acc2', // The contra account
      });
      // Mock generateTransactionEntriesFromStaging to be successful
      // We don't need to spy on it here if we trust its internal logic,
      // but we do need the ReconRule to be found by it.
      
      const mockReturnedTransaction = { transaction_id: 'new_tx_123', status: TransactionStatus.EXPECTED, entries: [/* entries don't need to be exact here as we check call args */] };
      transactionCore.createTransactionInternal.mockResolvedValueOnce(mockReturnedTransaction);

      const result = await processStagingEntryWithRecon(mockStagingEntry, merchantId);

      expect(transactionCore.createTransactionInternal).toHaveBeenCalledTimes(1);
      const [receivedTxShell, receivedActualEntry, receivedExpectedEntry] = transactionCore.createTransactionInternal.mock.calls[0];

      // Check Transaction Shell
      expect(receivedTxShell).toEqual(expect.objectContaining({ 
          merchant_id: merchantId,
          status: TransactionStatus.EXPECTED,
          logical_transaction_id: mockStagingEntry.staging_entry_id,
          version: 1,
          metadata: { 
            payment_ref: 'pay-abc', 
            order_id: undefined,
            source_staging_entry_id: mockStagingEntry.staging_entry_id, 
            processing_mode: StagingEntryProcessingMode.TRANSACTION,
          }
      }));

      // Check Actual Entry (POSTED)
      expect(receivedActualEntry).toEqual(expect.objectContaining({
          account_id: mockStagingEntry.account_id,
          entry_type: mockStagingEntry.entry_type,
          amount: mockStagingEntry.amount, // This will be a Decimal instance
          currency: mockStagingEntry.currency,
          status: EntryStatus.POSTED,
          effective_date: mockStagingEntry.effective_date, // This will be a Date instance
          metadata: { 
            payment_ref: 'pay-abc', 
            order_id: undefined,
            source_staging_entry_id: mockStagingEntry.staging_entry_id, 
          }
      }));
      // Ensure Decimal and Date objects are compared by value if necessary
      expect(receivedActualEntry.amount.equals(mockStagingEntry.amount)).toBe(true);
      expect(receivedActualEntry.effective_date.getTime()).toBe(mockStagingEntry.effective_date.getTime());


      // Check Expected Entry (EXPECTED)
      expect(receivedExpectedEntry).toEqual(expect.objectContaining({
          account_id: 'acc2', // from reconRule
          entry_type: EntryType.CREDIT, 
          amount: mockStagingEntry.amount, // This will be a Decimal instance
          currency: mockStagingEntry.currency,
          status: EntryStatus.EXPECTED,
          effective_date: mockStagingEntry.effective_date, // This will be a Date instance
          metadata: { 
            payment_ref: 'pay-abc', // Now expecting payment_ref due to the fix in engine.js
            order_id: undefined,
            source_staging_entry_id: mockStagingEntry.staging_entry_id, 
            recon_rule_id: 'rule-tx-mode-success', 
          }
      }));
      expect(receivedExpectedEntry.amount.equals(mockStagingEntry.amount)).toBe(true);
      expect(receivedExpectedEntry.effective_date.getTime()).toBe(mockStagingEntry.effective_date.getTime());
      
      expect(prisma.stagingEntry.update).toHaveBeenCalledWith({
        where: { staging_entry_id: mockStagingEntry.staging_entry_id },
        data: {
          status: StagingEntryStatus.PROCESSED,
          discarded_at: expect.any(Date),
          metadata: expect.objectContaining({ created_transaction_id: 'new_tx_123', match_type: 'NewTransactionGenerated' }),
        },
      });
      expect(result).toEqual(mockReturnedTransaction);
    });

    test('should handle NoReconRuleFoundError from generateTransactionEntriesFromStaging in TRANSACTION mode', async () => {
      // Ensure ReconRule.findFirst returns null for this specific path in generateTransactionEntriesFromStaging
      prisma.reconRule.findFirst.mockResolvedValueOnce(null);
      
      // Ensure ReconRule.findFirst (called by generateTransactionEntriesFromStaging) returns null
      prisma.reconRule.findFirst.mockResolvedValueOnce(null); 
      
      // This error message comes from generateTransactionEntriesFromStaging
      const expectedErrorMessage = `No reconciliation rule found for merchant ${merchantId} where account ${mockStagingEntry.account_id} is account_one_id (for generating transaction entries)`;

      await expect(processStagingEntryWithRecon(mockStagingEntry, merchantId)).rejects.toThrow(expectedErrorMessage);
      await expect(processStagingEntryWithRecon(mockStagingEntry, merchantId)).rejects.toBeInstanceOf(NoReconRuleFoundError);
      
      expect(prisma.stagingEntry.update).toHaveBeenCalledWith({
        where: { staging_entry_id: mockStagingEntry.staging_entry_id },
        data: {
          status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,
          metadata: expect.objectContaining({ 
            error: expectedErrorMessage, // Updated expected error message
            error_type: 'NoReconRuleFoundError' 
          }),
        },
      });
      const updateCallData = prisma.stagingEntry.update.mock.calls[0][0].data;
      expect(updateCallData.discarded_at).toBeUndefined();
    });

    test('should handle BalanceError from createTransactionInternal in TRANSACTION mode', async () => {
      const originalFindFirstMock = prisma.reconRule.findFirst; // Store original/previous mock

      // Override prisma.reconRule.findFirst specifically for this test's execution path
      prisma.reconRule.findFirst = jest.fn().mockResolvedValue({
        id: 'rule-for-tx-balance-error',
        merchant_id: merchantId,
        account_one_id: mockStagingEntry.account_id, // Must match stagingEntry
        account_two_id: 'acc-contra-for-balance-test', // Contra account for the rule
      });
      
      const balanceErrorMessage = 'Balance error in TRANSACTION mode';
      transactionCore.createTransactionInternal.mockRejectedValueOnce(new BalanceError(balanceErrorMessage));

      await expect(processStagingEntryWithRecon(mockStagingEntry, merchantId)).rejects.toThrow(BalanceError);

      expect(prisma.stagingEntry.update).toHaveBeenCalledWith({
        where: { staging_entry_id: mockStagingEntry.staging_entry_id },
        data: {
          status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,
          metadata: expect.objectContaining({ error: balanceErrorMessage, error_type: 'BalanceError' }),
        },
      });
      const updateCallData = prisma.stagingEntry.update.mock.calls[0][0].data;
      expect(updateCallData.discarded_at).toBeUndefined();

      prisma.reconRule.findFirst = originalFindFirstMock; // Restore original/previous mock
    });
  });
});
