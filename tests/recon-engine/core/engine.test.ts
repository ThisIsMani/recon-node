import { generateTransactionEntriesFromStaging, NoReconRuleFoundError, processStagingEntryWithRecon } from '../../../src/server/core/recon-engine/engine';
import prismaClient from '../../../src/services/prisma';
import * as transactionCore from '../../../src/server/core/transaction';
import { BalanceError } from '../../../src/server/core/transaction';
import { EntryStatus, EntryType, StagingEntryStatus, TransactionStatus, StagingEntryProcessingMode, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock Prisma - This will now use the manual mock from src/services/__mocks__/prisma.ts
jest.mock('../../../src/services/prisma');

// Mock transactionCore
jest.mock('../../../src/server/core/transaction', () => ({
  __esModule: true,
  createTransactionInternal: jest.fn(),
  BalanceError: class BalanceError extends Error { constructor(message: string) { super(message); this.name = 'BalanceError'; } },
}));

const mockPrisma = prismaClient as jest.Mocked<typeof prismaClient>;
const mockTransactionCore = transactionCore as jest.Mocked<typeof transactionCore>;

// Helper type for mocks
type MockTransactionWithEntries = Prisma.TransactionGetPayload<{ include: { entries: true } }>;


describe('Recon Engine Core Logic - generateTransactionEntriesFromStaging', () => {
  let mockStagingEntry: any; // Use 'any' for simplicity with Decimal and Prisma.JsonObject
  const merchantId = 'merchant-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockStagingEntry = {
      staging_entry_id: 'staging-abc',
      account_id: 'account-from',
      entry_type: EntryType.DEBIT,
      amount: new Decimal('100.00'),
      currency: 'USD',
      effective_date: new Date('2025-05-20T00:00:00.000Z'),
      metadata: {
        order_id: 'order-xyz',
        notes: 'Initial payment',
      } as Prisma.JsonObject,
    };
  });

  test('should generate actual and expected entries when a recon rule (staging acc as account_one_id) is found', async () => {
    const mockRule = {
      id: 'rule-1',
      merchant_id: merchantId,
      account_one_id: mockStagingEntry.account_id,
      account_two_id: 'account-to',
    };
    (mockPrisma.reconRule.findFirst as jest.Mock).mockImplementation(async (args) => {
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
    expect((actualEntry.amount as Decimal).equals(mockStagingEntry.amount)).toBe(true);
    expect((expectedEntry.amount as Decimal).equals(mockStagingEntry.amount)).toBe(true);
  });

  test('should throw NoReconRuleFoundError if no recon rule (staging acc as account_one_id) is found', async () => {
    (mockPrisma.reconRule.findFirst as jest.Mock).mockResolvedValue(null);
    const expectedErrorMessage = `No reconciliation rule found for merchant ${merchantId} where account ${mockStagingEntry.account_id} is account_one_id (for generating transaction entries)`;
    await expect(
      generateTransactionEntriesFromStaging(mockStagingEntry, merchantId)
    ).rejects.toThrow(expectedErrorMessage);
    await expect(
        generateTransactionEntriesFromStaging(mockStagingEntry, merchantId)
      ).rejects.toBeInstanceOf(NoReconRuleFoundError);
  });
});

describe('Recon Engine Core Logic - processStagingEntryWithRecon', () => {
  let mockStagingEntry: any; // Use 'any' for simplicity
  const merchantId = 'merchant-789';

  beforeEach(() => {
    jest.clearAllMocks();
    mockStagingEntry = {
      staging_entry_id: 'staging-xyz-789',
      account_id: 'account-main',
      entry_type: EntryType.DEBIT,
      amount: new Decimal('200.00'),
      currency: 'EUR',
      effective_date: new Date('2025-06-01T00:00:00.000Z'),
      processing_mode: StagingEntryProcessingMode.CONFIRMATION,
      metadata: { payment_ref: 'pay-abc' } as Prisma.JsonObject,
      created_at: new Date(), // Added missing properties for type consistency
      updated_at: new Date(),
      discarded_at: null,
      transaction_id: null,
    };
    (mockPrisma.entry.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.stagingEntry.update as jest.Mock).mockResolvedValue({});
    // Ensure mockResolvedValue matches TransactionWithEntries structure
    mockTransactionCore.createTransactionInternal.mockResolvedValue({
      transaction_id: 'new_txn_id',
      logical_transaction_id: 'ltid_new_txn_123',
      version: 1,
      merchant_id: merchantId,
      status: TransactionStatus.POSTED, // Or EXPECTED depending on test
      created_at: new Date(),
      updated_at: new Date(),
      discarded_at: null,
      metadata: {},
      entries: []
    } as MockTransactionWithEntries);
    
    (mockPrisma.reconRule.findFirst as jest.Mock).mockResolvedValue(null);

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
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
    (mockPrisma.reconRule.findFirst as jest.Mock).mockResolvedValue(null);
    const expectedErrorMessage = `No matching expected entry found for staging_entry_id ${mockStagingEntry.staging_entry_id} (CONFIRMATION mode). Staging entry requires manual review.`;
    await expect(processStagingEntryWithRecon(mockStagingEntry, merchantId))
      .rejects
      .toThrow(expectedErrorMessage);
    expect(mockPrisma.stagingEntry.update).toHaveBeenCalledWith({
      where: { staging_entry_id: mockStagingEntry.staging_entry_id },
      data: {
        status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,
        metadata: expect.objectContaining({ error: expectedErrorMessage, error_type: 'NoMatchFoundError' }),
      },
    });
    const updateCallData = (mockPrisma.stagingEntry.update as jest.Mock).mock.calls[0][0].data;
    expect(updateCallData.discarded_at).toBeUndefined();
  });
  
  test('should handle BalanceError from createTransactionInternal during fulfillment, update staging entry (no discard), and re-throw', async () => {
    const orderId = 'order_balance_error_fulfill';
    (mockPrisma.reconRule.findFirst as jest.Mock).mockResolvedValueOnce({
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
        { entry_id: 'orig_entry_posted', account_id: 'some-other-account', entry_type: EntryType.DEBIT, amount: new Decimal('200.00'), currency: 'EUR', status: EntryStatus.POSTED, effective_date: new Date(), metadata: { order_id: orderId } as Prisma.JsonObject },
        { entry_id: 'orig_entry_expected', account_id: mockStagingEntry.account_id, entry_type: mockStagingEntry.entry_type, amount: new Decimal('200.00'), currency: mockStagingEntry.currency, status: EntryStatus.EXPECTED, effective_date: new Date(), metadata: { order_id: orderId } as Prisma.JsonObject },
      ],
    };
    (mockPrisma.entry.findMany as jest.Mock).mockResolvedValueOnce([{ ...mockOriginalTransaction.entries[1], transaction: mockOriginalTransaction }]);
    
    const balanceErrorMessage = 'Amounts do not balance during fulfillment';
    mockTransactionCore.createTransactionInternal.mockRejectedValueOnce(new BalanceError(balanceErrorMessage));
    
    mockStagingEntry.metadata = { order_id: orderId } as Prisma.JsonObject;
    mockStagingEntry.processing_mode = StagingEntryProcessingMode.CONFIRMATION;

    await expect(processStagingEntryWithRecon(mockStagingEntry, merchantId)).rejects.toThrow(BalanceError);
    
    expect(mockPrisma.stagingEntry.update).toHaveBeenCalledWith({
      where: { staging_entry_id: mockStagingEntry.staging_entry_id },
      data: { 
        status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,
        metadata: expect.objectContaining({ error: balanceErrorMessage, error_type: 'BalanceError' })
      },
    });
    const updateCallData = (mockPrisma.stagingEntry.update as jest.Mock).mock.calls[0][0].data;
    expect(updateCallData.discarded_at).toBeUndefined();
  });
  
  test('should handle generic error from createTransactionInternal during fulfillment, update staging entry (no discard), and re-throw', async () => {
    const orderId = 'order_generic_error_fulfill';
    (mockPrisma.reconRule.findFirst as jest.Mock).mockResolvedValueOnce({
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
        { entry_id: 'orig_entry_posted_g', account_id: 'some-other-account-g', entry_type: EntryType.DEBIT, amount: new Decimal('200.00'), currency: 'EUR', status: EntryStatus.POSTED, effective_date: new Date(), metadata: { order_id: orderId } as Prisma.JsonObject },
        { entry_id: 'orig_entry_expected_g', account_id: mockStagingEntry.account_id, entry_type: mockStagingEntry.entry_type, amount: new Decimal('200.00'), currency: mockStagingEntry.currency, status: EntryStatus.EXPECTED, effective_date: new Date(), metadata: { order_id: orderId } as Prisma.JsonObject },
      ],
    };
    (mockPrisma.entry.findMany as jest.Mock).mockResolvedValueOnce([{ ...mockOriginalTransaction.entries[1], transaction: mockOriginalTransaction }]);
    
    const genericErrorMessage = 'Generic createTransactionInternal error during fulfillment';
    mockTransactionCore.createTransactionInternal.mockRejectedValueOnce(new Error(genericErrorMessage));
    mockStagingEntry.metadata = { order_id: orderId } as Prisma.JsonObject;
    mockStagingEntry.processing_mode = StagingEntryProcessingMode.CONFIRMATION;

    await expect(processStagingEntryWithRecon(mockStagingEntry, merchantId)).rejects.toThrow(genericErrorMessage);

    expect(mockPrisma.stagingEntry.update).toHaveBeenCalledWith({
      where: { staging_entry_id: mockStagingEntry.staging_entry_id },
      data: { 
        status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,
        metadata: expect.objectContaining({ error: genericErrorMessage, error_type: 'Error' })
      },
    });
    const updateCallData = (mockPrisma.stagingEntry.update as jest.Mock).mock.calls[0][0].data;
    expect(updateCallData.discarded_at).toBeUndefined();
  });

  test('should throw error if stagingEntry is invalid', async () => {
    await expect(processStagingEntryWithRecon(null as any, merchantId)).rejects.toThrow('Invalid stagingEntry object provided to processStagingEntryWithRecon.');
    await expect(processStagingEntryWithRecon({} as any, merchantId)).rejects.toThrow('Invalid stagingEntry object provided to processStagingEntryWithRecon.');
  });

  test('should throw error if merchantId is invalid', async () => {
    await expect(processStagingEntryWithRecon(mockStagingEntry, null as any)).rejects.toThrow('Invalid merchantId provided to processStagingEntryWithRecon.');
  });
  
  test('should correctly pass metadata when creating an EVOLVED transaction during fulfillment', async () => {
    const orderId = 'order_metadata_fulfill';
    const originalTxId = 'orig_txn_meta';
    const expectedEntryId = 'orig_expected_entry_meta';

    (mockPrisma.reconRule.findFirst as jest.Mock).mockResolvedValueOnce({
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
        { entry_id: 'orig_posted_meta', account_id: 'some-other-account-m', entry_type: EntryType.DEBIT, amount: new Decimal('200.00'), currency: 'EUR', status: EntryStatus.POSTED, effective_date: new Date(), metadata: { order_id: orderId, original_note: "posted leg" } as Prisma.JsonObject },
        { entry_id: expectedEntryId, account_id: mockStagingEntry.account_id, entry_type: mockStagingEntry.entry_type, amount: new Decimal('200.00'), currency: mockStagingEntry.currency, status: EntryStatus.EXPECTED, effective_date: new Date(), metadata: { order_id: orderId, original_note: "expected leg" } as Prisma.JsonObject },
      ],
    };
    (mockPrisma.entry.findMany as jest.Mock).mockResolvedValueOnce([{ ...mockOriginalTransaction.entries[1], transaction: mockOriginalTransaction }]);

    mockStagingEntry.metadata = { order_id: orderId, fulfilling_note: "this is the fulfillment" } as Prisma.JsonObject;
    mockStagingEntry.processing_mode = StagingEntryProcessingMode.CONFIRMATION;
    
    const mockEvolvedTxId = 'evolved_txn_meta';
    mockTransactionCore.createTransactionInternal.mockResolvedValueOnce({
      transaction_id: mockEvolvedTxId,
      logical_transaction_id: `ltid_${orderId}_evolved`,
      version: 2,
      merchant_id: merchantId,
      status: TransactionStatus.POSTED,
      created_at: new Date(),
      updated_at: new Date(),
      discarded_at: null,
      metadata: {},
      entries: []
    } as MockTransactionWithEntries);

    await processStagingEntryWithRecon(mockStagingEntry, merchantId);
    
    expect(mockTransactionCore.createTransactionInternal).toHaveBeenCalledTimes(1);
    const createEvolvedTxArgs = mockTransactionCore.createTransactionInternal.mock.calls[0];
    
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

  describe('Processing Mode: TRANSACTION', () => {
    beforeEach(() => {
      mockStagingEntry.processing_mode = StagingEntryProcessingMode.TRANSACTION;
      mockStagingEntry.metadata = { payment_ref: 'pay-abc', order_id: undefined } as Prisma.JsonObject;
    });

    test('should create a new transaction with POSTED and EXPECTED entries', async () => {
      (mockPrisma.reconRule.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'rule-tx-mode-success',
        merchant_id: merchantId,
        account_one_id: mockStagingEntry.account_id,
        account_two_id: 'acc2',
      });
      
      const mockReturnedTransaction: MockTransactionWithEntries = {
        transaction_id: 'new_tx_123',
        logical_transaction_id: mockStagingEntry.staging_entry_id,
        version: 1,
        merchant_id: merchantId,
        status: TransactionStatus.EXPECTED,
        created_at: new Date(),
        updated_at: new Date(),
        discarded_at: null,
        metadata: {},
        entries: [] 
      };
      mockTransactionCore.createTransactionInternal.mockResolvedValueOnce(mockReturnedTransaction);

      const result = await processStagingEntryWithRecon(mockStagingEntry, merchantId);

      expect(mockTransactionCore.createTransactionInternal).toHaveBeenCalledTimes(1);
      const [receivedTxShell, receivedActualEntry, receivedExpectedEntry] = mockTransactionCore.createTransactionInternal.mock.calls[0];

      expect(receivedTxShell).toEqual(expect.objectContaining({ 
          merchant_id: merchantId,
          status: TransactionStatus.EXPECTED,
          logical_transaction_id: mockStagingEntry.staging_entry_id,
          version: 1,
          metadata: expect.objectContaining({ 
            payment_ref: 'pay-abc', 
            source_staging_entry_id: mockStagingEntry.staging_entry_id, 
            processing_mode: StagingEntryProcessingMode.TRANSACTION,
            account_scoped: true,
            original_order_id: null
          })
      }));

      expect(receivedActualEntry).toEqual(expect.objectContaining({
          account_id: mockStagingEntry.account_id,
          entry_type: mockStagingEntry.entry_type,
          amount: mockStagingEntry.amount,
          currency: mockStagingEntry.currency,
          status: EntryStatus.POSTED,
          effective_date: mockStagingEntry.effective_date,
          metadata: { 
            payment_ref: 'pay-abc', 
            order_id: undefined,
            source_staging_entry_id: mockStagingEntry.staging_entry_id, 
          }
      }));
      expect((receivedActualEntry.amount as Decimal).equals(mockStagingEntry.amount)).toBe(true);
      expect((receivedActualEntry.effective_date as Date).getTime()).toBe((mockStagingEntry.effective_date as Date).getTime());

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
      expect((receivedExpectedEntry.amount as Decimal).equals(mockStagingEntry.amount)).toBe(true);
      expect((receivedExpectedEntry.effective_date as Date).getTime()).toBe((mockStagingEntry.effective_date as Date).getTime());
      
      expect(mockPrisma.stagingEntry.update).toHaveBeenCalledWith({
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
      (mockPrisma.reconRule.findFirst as jest.Mock).mockResolvedValueOnce(null); 
      
      const expectedErrorMessage = `No reconciliation rule found for merchant ${merchantId} where account ${mockStagingEntry.account_id} is account_one_id (for generating transaction entries)`;

      await expect(processStagingEntryWithRecon(mockStagingEntry, merchantId)).rejects.toThrow(expectedErrorMessage);
      await expect(processStagingEntryWithRecon(mockStagingEntry, merchantId)).rejects.toBeInstanceOf(NoReconRuleFoundError);
      
      expect(mockPrisma.stagingEntry.update).toHaveBeenCalledWith({
        where: { staging_entry_id: mockStagingEntry.staging_entry_id },
        data: {
          status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,
          metadata: expect.objectContaining({ 
            error: expectedErrorMessage,
            error_type: 'NoReconRuleFoundError' 
          }),
        },
      });
      const updateCallData = (mockPrisma.stagingEntry.update as jest.Mock).mock.calls[0][0].data;
      expect(updateCallData.discarded_at).toBeUndefined();
    });

    test('should handle BalanceError from createTransactionInternal in TRANSACTION mode', async () => {
      const originalFindFirstMock = mockPrisma.reconRule.findFirst;

      (mockPrisma.reconRule.findFirst as jest.Mock) = jest.fn().mockResolvedValue({
        id: 'rule-for-tx-balance-error',
        merchant_id: merchantId,
        account_one_id: mockStagingEntry.account_id,
        account_two_id: 'acc-contra-for-balance-test',
      });
      
      const balanceErrorMessage = 'Balance error in TRANSACTION mode';
      mockTransactionCore.createTransactionInternal.mockRejectedValueOnce(new BalanceError(balanceErrorMessage));

      await expect(processStagingEntryWithRecon(mockStagingEntry, merchantId)).rejects.toThrow(BalanceError);

      expect(mockPrisma.stagingEntry.update).toHaveBeenCalledWith({
        where: { staging_entry_id: mockStagingEntry.staging_entry_id },
        data: {
          status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,
          metadata: expect.objectContaining({ error: balanceErrorMessage, error_type: 'BalanceError' }),
        },
      });
      const updateCallData = (mockPrisma.stagingEntry.update as jest.Mock).mock.calls[0][0].data;
      expect(updateCallData.discarded_at).toBeUndefined();

      mockPrisma.reconRule.findFirst = originalFindFirstMock;
    });
  });
});
