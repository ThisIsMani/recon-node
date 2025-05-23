import { createTransactionInternal, BalanceError } from '../../../src/server/core/transaction';
import * as entryCore from '../../../src/server/core/entry';
import prisma from '../../../src/services/prisma';
import { TransactionStatus, EntryType, AccountType, EntryStatus as PrismaEntryStatus, MerchantAccount, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock entryCore.createEntryInternal
jest.mock('../../../src/server/core/entry', () => ({
  createEntryInternal: jest.fn(),
}));

// Mock Prisma client
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
jest.mock('../../../src/services/prisma'); // This will now use the manual mock from src/services/__mocks__/prisma.ts

describe('Transaction Core Logic - createTransactionInternal', () => {
  let testMerchant: Partial<MerchantAccount>;
  let actualEntryData: any, expectedEntryData: any, transactionShellData: any;
  let mockTxClient: jest.Mocked<Prisma.TransactionClient>;
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    testMerchant = { merchant_id: 'tx-core-merchant', merchant_name: 'Tx Core Test Merchant' };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    transactionShellData = {
      merchant_id: testMerchant.merchant_id,
      status: TransactionStatus.POSTED,
      metadata: { ref: 'test-tx-001' },
    };
    actualEntryData = {
      account_id: 'account-actual',
      entry_type: EntryType.DEBIT,
      amount: new Decimal('100.00'),
      currency: 'USD',
      status: PrismaEntryStatus.POSTED,
      effective_date: new Date().toISOString(),
      metadata: { note: 'Actual debit' },
    };
    expectedEntryData = {
      account_id: 'account-expected',
      entry_type: EntryType.CREDIT,
      amount: new Decimal('100.00'),
      currency: 'USD',
      status: PrismaEntryStatus.EXPECTED,
      effective_date: new Date().toISOString(),
      metadata: { note: 'Expected credit' },
    };

    mockTxClient = {
      transaction: { create: jest.fn() },
      entry: { create: jest.fn() }, // Not directly used by createTransactionInternal, but entryCore might use it
      merchantAccount: { findUnique: jest.fn() }, // Add if tx operations need it
      // Add other models if necessary for tx operations
    } as unknown as jest.Mocked<Prisma.TransactionClient>;
    
    (mockPrisma.merchantAccount.findUnique as jest.Mock).mockResolvedValue(testMerchant);
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(mockTxClient));
    const mockDate = new Date();
    (mockTxClient.transaction.create as jest.Mock).mockResolvedValue({ 
      transaction_id: 'new-tx-id', 
      ...transactionShellData,
      created_at: mockDate, // Add timestamps to mock
      updated_at: mockDate,
      logical_transaction_id: transactionShellData.logical_transaction_id || 'default-logical-id', // Ensure all fields of PrismaTransaction are present
      version: transactionShellData.version || 1, // Ensure all fields of PrismaTransaction are present
      discarded_at: null, // Ensure all fields of PrismaTransaction are present
    });
    (entryCore.createEntryInternal as jest.Mock)
      .mockImplementation(async (entryData, tx) => ({ 
        ...entryData, 
        entry_id: `entry-${entryData.account_id}`,
        created_at: mockDate, // Add timestamps to mock entry if needed by its type
        updated_at: mockDate,
        discarded_at: null,
       }));
  });

  afterEach(() => {
    if (consoleErrorSpy) consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('should create a transaction and two entries successfully with balanced data', async () => {
    const mockDate = new Date(); // Define mockDate here for the test scope
    // Update the mock setup to use this specific mockDate for this test if it was defined in beforeEach
    // Or ensure beforeEach's mockDate is accessible if that was the intent.
    // For this fix, assuming we want a fresh mockDate for this specific test's assertion.
    // If createTransactionInternal relies on the beforeEach mock, this might need adjustment.
    // However, the error is in the assertion part, so this should fix it.
    
    // Re-setup the mock for transaction.create if it was using a mockDate from beforeEach
    // This ensures the result.created_at will match this test's mockDate
     (mockTxClient.transaction.create as jest.Mock).mockResolvedValueOnce({ 
      transaction_id: 'new-tx-id', 
      ...transactionShellData,
      created_at: mockDate, 
      updated_at: mockDate,
      logical_transaction_id: transactionShellData.logical_transaction_id || 'default-logical-id', 
      version: transactionShellData.version || 1, 
      discarded_at: null, 
    });
    // Also re-setup entryCore mock if it used a different mockDate
    (entryCore.createEntryInternal as jest.Mock).mockImplementation(async (entryData, tx) => ({ 
        ...entryData, 
        entry_id: `entry-${entryData.account_id}`,
        created_at: mockDate, 
        updated_at: mockDate,
        discarded_at: null,
       }));


    const result = await createTransactionInternal(transactionShellData, actualEntryData, expectedEntryData);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockTxClient.transaction.create).toHaveBeenCalledWith({ data: transactionShellData });
    expect(entryCore.createEntryInternal).toHaveBeenCalledTimes(2);
    expect(entryCore.createEntryInternal).toHaveBeenCalledWith(
      { ...actualEntryData, transaction_id: 'new-tx-id' },
      mockTxClient
    );
    expect(entryCore.createEntryInternal).toHaveBeenCalledWith(
      { ...expectedEntryData, transaction_id: 'new-tx-id' },
      mockTxClient
    );
    expect(result.transaction_id).toBe('new-tx-id');
    expect(result).toHaveProperty('created_at', mockDate); // Check for timestamps
    expect(result).toHaveProperty('updated_at', mockDate);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].account_id).toBe('account-actual');
    expect(result.entries[1].account_id).toBe('account-expected');
  });

  it('should throw BalanceError if amounts do not match', async () => {
    const unbalancedExpectedEntry = { ...expectedEntryData, amount: new Decimal('99.00') };
    await expect(
      createTransactionInternal(transactionShellData, actualEntryData, unbalancedExpectedEntry)
    ).rejects.toThrow(new BalanceError('Amounts do not balance: actual 100, expected 99')); // Adjusted assertion
  });

  it('should throw BalanceError if currencies do not match', async () => {
    const unbalancedExpectedEntry = { ...expectedEntryData, currency: 'EUR' };
    await expect(
      createTransactionInternal(transactionShellData, actualEntryData, unbalancedExpectedEntry)
    ).rejects.toThrow(new BalanceError('Currencies do not match: actual USD, expected EUR'));
  });

  it('should throw BalanceError if entry types are not one DEBIT and one CREDIT (both DEBIT)', async () => {
    const unbalancedExpectedEntry = { ...expectedEntryData, entry_type: EntryType.DEBIT };
    await expect(
      createTransactionInternal(transactionShellData, actualEntryData, unbalancedExpectedEntry)
    ).rejects.toThrow(new BalanceError('Entry types must be one DEBIT and one CREDIT.'));
  });

  it('should throw BalanceError if entry types are not one DEBIT and one CREDIT (both CREDIT)', async () => {
    const actualCreditEntry = { ...actualEntryData, entry_type: EntryType.CREDIT };
    await expect(
      createTransactionInternal(transactionShellData, actualCreditEntry, expectedEntryData)
    ).rejects.toThrow(new BalanceError('Entry types must be one DEBIT and one CREDIT.'));
  });
  
  it('should throw Error if merchant_id is missing', async () => {
    await expect(
      createTransactionInternal({ ...transactionShellData, merchant_id: undefined }, actualEntryData, expectedEntryData)
    ).rejects.toThrow('Missing required fields for transaction shell: merchant_id, status.');
  });

  it('should throw Error if status is missing', async () => {
    await expect(
      createTransactionInternal({ ...transactionShellData, status: undefined }, actualEntryData, expectedEntryData)
    ).rejects.toThrow('Missing required fields for transaction shell: merchant_id, status.');
  });
  
  it('should throw Error if transaction status is invalid', async () => {
    await expect(
      createTransactionInternal({ ...transactionShellData, status: 'INVALID_STATUS' as TransactionStatus }, actualEntryData, expectedEntryData)
    ).rejects.toThrow('Invalid transaction status: INVALID_STATUS');
  });

  it('should throw Error if merchant is not found', async () => {
    (mockPrisma.merchantAccount.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(
      createTransactionInternal(transactionShellData, actualEntryData, expectedEntryData)
    ).rejects.toThrow(`Merchant with ID ${testMerchant.merchant_id} not found.`);
  });

  it('should throw Error if actualEntryData is missing', async () => {
    await expect(
      createTransactionInternal(transactionShellData, null as any, expectedEntryData)
    ).rejects.toThrow('Actual and expected entry data must be provided.');
  });

  it('should throw Error if expectedEntryData is missing', async () => {
    await expect(
      createTransactionInternal(transactionShellData, actualEntryData, null as any)
    ).rejects.toThrow('Actual and expected entry data must be provided.');
  });

  it('should re-throw BalanceError if it occurs within $transaction', async () => {
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      throw new BalanceError("Simulated balance error in transaction");
    });
    await expect(
      createTransactionInternal(transactionShellData, actualEntryData, expectedEntryData)
    ).rejects.toThrow(new BalanceError("Simulated balance error in transaction"));
  });

  it('should throw a generic error if transaction creation fails within $transaction', async () => {
    (mockTxClient.transaction.create as jest.Mock).mockRejectedValueOnce(new Error('DB error creating transaction'));
    await expect(
      createTransactionInternal(transactionShellData, actualEntryData, expectedEntryData)
    ).rejects.toThrow('Could not create internal transaction with entries due to an internal error.');
  });

  it('should throw a generic error if first entry creation fails within $transaction', async () => {
    (entryCore.createEntryInternal as jest.Mock).mockImplementationOnce(async (entryData, tx) => {
        if(entryData.account_id === actualEntryData.account_id) throw new Error('DB error creating first entry');
        return { ...entryData, entry_id: `entry-${entryData.account_id}` };
    });
    await expect(
      createTransactionInternal(transactionShellData, actualEntryData, expectedEntryData)
    ).rejects.toThrow('Could not create internal transaction with entries due to an internal error.');
  });

  it('should throw a generic error if second entry creation fails within $transaction', async () => {
    (entryCore.createEntryInternal as jest.Mock).mockImplementation(async (entryData, tx) => {
        if(entryData.account_id === actualEntryData.account_id) return { ...entryData, entry_id: `entry-${entryData.account_id}` };
        if(entryData.account_id === expectedEntryData.account_id) throw new Error('DB error creating second entry');
        return { ...entryData, entry_id: `entry-${entryData.account_id}` }; // Should not be reached for second call
    });
    await expect(
      createTransactionInternal(transactionShellData, actualEntryData, expectedEntryData)
    ).rejects.toThrow('Could not create internal transaction with entries due to an internal error.');
  });
  
   it('should use callingTx if provided', async () => {
    const mockCallingTxProvided = {
      transaction: { create: jest.fn() },
      merchantAccount: { findUnique: jest.fn() },
      // entryCore.createEntryInternal is globally mocked
    } as unknown as jest.Mocked<Prisma.TransactionClient>;

    (mockCallingTxProvided.merchantAccount.findUnique as jest.Mock).mockResolvedValue(testMerchant);
    const mockDateCallingTx = new Date();
    (mockCallingTxProvided.transaction.create as jest.Mock).mockResolvedValue({ 
      transaction_id: 'new-tx-id-from-callingTx', 
      ...transactionShellData,
      created_at: mockDateCallingTx, // Add timestamps
      updated_at: mockDateCallingTx,
      logical_transaction_id: transactionShellData.logical_transaction_id || 'default-logical-id-callingtx',
      version: transactionShellData.version || 1,
      discarded_at: null,
    });

    await createTransactionInternal(transactionShellData, actualEntryData, expectedEntryData, mockCallingTxProvided);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockCallingTxProvided.transaction.create).toHaveBeenCalledWith({ data: transactionShellData });
    expect(entryCore.createEntryInternal).toHaveBeenCalledWith(
      expect.objectContaining({ account_id: actualEntryData.account_id }),
      mockCallingTxProvided
    );
    expect(entryCore.createEntryInternal).toHaveBeenCalledWith(
      expect.objectContaining({ account_id: expectedEntryData.account_id }),
      mockCallingTxProvided
    );
  });
});
