// tests/transaction/core/transaction.js
const { createTransactionInternal, BalanceError } = require('../../../src/server/core/transaction/index');
const entryCore = require('../../../src/server/core/entry/index');
const prisma = require('../../../src/services/prisma');
const { TransactionStatus, EntryType, AccountType, EntryStatus: PrismaEntryStatus } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library'); // Import Decimal

// Mock entryCore.createEntryInternal
jest.mock('../../../src/server/core/entry/index', () => ({
  createEntryInternal: jest.fn(),
}));

// Mock Prisma client for $transaction and specific model operations
jest.mock('../../../src/services/prisma', () => {
  const actualPrisma = jest.requireActual('../../../src/services/prisma');
  return {
    ...actualPrisma, // Spread actual Prisma to keep enums, etc.
    $transaction: jest.fn(),
    merchantAccount: {
      findUnique: jest.fn(),
    },
    transaction: { // Mock transaction model methods if needed directly by createTransactionInternal (though it uses tx)
      create: jest.fn(),
    },
    // entry model is not directly used by createTransactionInternal, it uses entryCore
  };
});


describe('Transaction Core Logic - createTransactionInternal', () => {
  let testMerchant;
  let actualEntryData, expectedEntryData, transactionShellData;
  let mockTxClient; // For mocking operations within prisma.$transaction
  let consoleErrorSpy;

  beforeAll(async () => {
    // We don't need to create real DB records for merchant in these unit tests
    // as prisma.merchantAccount.findUnique will be mocked.
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
      amount: new Decimal('100.00'), // Use Decimal
      currency: 'USD',
      status: PrismaEntryStatus.POSTED,
      effective_date: new Date().toISOString(),
      metadata: { note: 'Actual debit' },
    };
    expectedEntryData = {
      account_id: 'account-expected',
      entry_type: EntryType.CREDIT,
      amount: new Decimal('100.00'), // Use Decimal
      currency: 'USD',
      status: PrismaEntryStatus.EXPECTED,
      effective_date: new Date().toISOString(),
      metadata: { note: 'Expected credit' },
    };

    // Mock for operations inside $transaction
    mockTxClient = {
      transaction: { create: jest.fn() },
      // entryCore.createEntryInternal is already mocked at the module level
    };
    
    // Default mock implementations
    prisma.merchantAccount.findUnique.mockResolvedValue(testMerchant);
    prisma.$transaction.mockImplementation(async (callback) => callback(mockTxClient));
    mockTxClient.transaction.create.mockResolvedValue({ 
      transaction_id: 'new-tx-id', 
      ...transactionShellData 
    });
    entryCore.createEntryInternal
      .mockImplementation(async (entryData, tx) => ({ ...entryData, entry_id: `entry-${entryData.account_id}` }));
  });

  afterEach(() => {
    // consoleErrorSpy.mockRestore(); // jest.restoreAllMocks() in jest.config.js or setupFilesAfterEnv should handle this.
                                   // However, if not, uncomment. For now, relying on global restore.
                                   // Let's be explicit as in entry.test.js
    if (consoleErrorSpy) consoleErrorSpy.mockRestore();
    jest.restoreAllMocks(); // This is good practice anyway
  });

  it('should create a transaction and two entries successfully with balanced data', async () => {
    const result = await createTransactionInternal(transactionShellData, actualEntryData, expectedEntryData);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
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
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].account_id).toBe('account-actual');
    expect(result.entries[1].account_id).toBe('account-expected');
  });

  it('should throw BalanceError if amounts do not match', async () => {
    const unbalancedExpectedEntry = { ...expectedEntryData, amount: new Decimal('99.00') }; // Use Decimal
    await expect(
      createTransactionInternal(transactionShellData, actualEntryData, unbalancedExpectedEntry)
    ).rejects.toThrow(BalanceError);
    await expect(
        createTransactionInternal(transactionShellData, actualEntryData, unbalancedExpectedEntry)
      ).rejects.toThrow('Amounts do not balance: actual 100, expected 99'); 
  });

  it('should throw BalanceError if currencies do not match', async () => {
    const unbalancedExpectedEntry = { ...expectedEntryData, currency: 'EUR' };
    await expect(
      createTransactionInternal(transactionShellData, actualEntryData, unbalancedExpectedEntry)
    ).rejects.toThrow(BalanceError);
    await expect(
        createTransactionInternal(transactionShellData, actualEntryData, unbalancedExpectedEntry)
      ).rejects.toThrow('Currencies do not match: actual USD, expected EUR');
  });

  it('should throw BalanceError if entry types are not one DEBIT and one CREDIT (both DEBIT)', async () => {
    const unbalancedExpectedEntry = { ...expectedEntryData, entry_type: EntryType.DEBIT };
    await expect(
      createTransactionInternal(transactionShellData, actualEntryData, unbalancedExpectedEntry)
    ).rejects.toThrow(BalanceError);
    await expect(
        createTransactionInternal(transactionShellData, actualEntryData, unbalancedExpectedEntry)
      ).rejects.toThrow('Entry types must be one DEBIT and one CREDIT.');
  });

  it('should throw BalanceError if entry types are not one DEBIT and one CREDIT (both CREDIT)', async () => {
    const actualCreditEntry = { ...actualEntryData, entry_type: EntryType.CREDIT };
    await expect(
      createTransactionInternal(transactionShellData, actualCreditEntry, expectedEntryData)
    ).rejects.toThrow(BalanceError);
     await expect(
        createTransactionInternal(transactionShellData, actualCreditEntry, expectedEntryData)
      ).rejects.toThrow('Entry types must be one DEBIT and one CREDIT.');
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
      createTransactionInternal({ ...transactionShellData, status: 'INVALID_STATUS' }, actualEntryData, expectedEntryData)
    ).rejects.toThrow('Invalid transaction status: INVALID_STATUS');
  });

  it('should throw Error if merchant is not found', async () => {
    prisma.merchantAccount.findUnique.mockResolvedValue(null);
    await expect(
      createTransactionInternal(transactionShellData, actualEntryData, expectedEntryData)
    ).rejects.toThrow(`Merchant with ID ${testMerchant.merchant_id} not found.`);
  });

  it('should throw Error if actualEntryData is missing', async () => {
    await expect(
      createTransactionInternal(transactionShellData, null, expectedEntryData)
    ).rejects.toThrow('Actual and expected entry data must be provided.');
  });

  it('should throw Error if expectedEntryData is missing', async () => {
    await expect(
      createTransactionInternal(transactionShellData, actualEntryData, null)
    ).rejects.toThrow('Actual and expected entry data must be provided.');
  });

  it('should re-throw BalanceError if it occurs within $transaction', async () => {
    prisma.$transaction.mockImplementation(async (callback) => {
      // Simulate a BalanceError being thrown by some logic before DB ops,
      // though in our current setup, BalanceError is thrown before $transaction is called.
      // This test is more conceptual for errors propagated from within the callback.
      // For a more direct test, one would mock createEntryInternal to throw,
      // but BalanceError is specifically for pre-DB checks.
      // Let's assume the callback itself could throw it for some reason.
      throw new BalanceError("Simulated balance error in transaction");
    });
    await expect(
      createTransactionInternal(transactionShellData, actualEntryData, expectedEntryData)
    ).rejects.toThrow(BalanceError);
     await expect(
      createTransactionInternal(transactionShellData, actualEntryData, expectedEntryData)
    ).rejects.toThrow("Simulated balance error in transaction");
  });

  it('should throw a generic error if transaction creation fails within $transaction', async () => {
    mockTxClient.transaction.create.mockRejectedValueOnce(new Error('DB error creating transaction'));
    await expect(
      createTransactionInternal(transactionShellData, actualEntryData, expectedEntryData)
    ).rejects.toThrow('Could not create internal transaction with entries due to an internal error.');
  });

  it('should throw a generic error if first entry creation fails within $transaction', async () => {
    entryCore.createEntryInternal.mockImplementationOnce(async (entryData, tx) => {
        if(entryData.account_id === actualEntryData.account_id) throw new Error('DB error creating first entry');
        return { ...entryData, entry_id: `entry-${entryData.account_id}` };
    });
    await expect(
      createTransactionInternal(transactionShellData, actualEntryData, expectedEntryData)
    ).rejects.toThrow('Could not create internal transaction with entries due to an internal error.');
  });

  it('should throw a generic error if second entry creation fails within $transaction', async () => {
    entryCore.createEntryInternal.mockImplementation(async (entryData, tx) => {
        if(entryData.account_id === actualEntryData.account_id) return { ...entryData, entry_id: `entry-${entryData.account_id}` };
        if(entryData.account_id === expectedEntryData.account_id) throw new Error('DB error creating second entry');
    });
    await expect(
      createTransactionInternal(transactionShellData, actualEntryData, expectedEntryData)
    ).rejects.toThrow('Could not create internal transaction with entries due to an internal error.');
  });
  
   it('should use callingTx if provided', async () => {
    const mockCallingTx = {
      $transaction: jest.fn().mockImplementation(async (callback) => callback(mockTxClient)),
      transaction: { create: jest.fn() },
      merchantAccount: { findUnique: jest.fn() }, // Added merchantAccount mock
      // entryCore.createEntryInternal is globally mocked and will receive mockCallingTx as tx
    };
    // Setup mocks for mockCallingTx's methods
    mockCallingTx.merchantAccount.findUnique.mockResolvedValue(testMerchant); // Mock the findUnique call
    mockCallingTx.transaction.create.mockResolvedValue({ transaction_id: 'new-tx-id-from-callingTx', ...transactionShellData });
    // entryCore.createEntryInternal is already globally mocked, it will receive mockCallingTx as its 'tx' param

    await createTransactionInternal(transactionShellData, actualEntryData, expectedEntryData, mockCallingTx);

    // Check if the $transaction on the global prisma was NOT called
    expect(prisma.$transaction).not.toHaveBeenCalled();
    
    // Since callingTx is passed directly to executeInTransaction, 
    // its methods (like transaction.create) should be called.
    // The mockTxClient setup for callingTx is a bit convoluted here.
    // Let's simplify: if callingTx is provided, its 'transaction.create' should be called.
    // The mockCallingTx itself should have the 'transaction.create' mock.
    
    // Re-evaluating the mock setup for this specific test:
    // mockCallingTx is passed as the prisma client instance to executeInTransaction.
    // So, mockCallingTx.transaction.create should be called.
    expect(mockCallingTx.transaction.create).toHaveBeenCalledWith({ 
      data: {
        ...transactionShellData
      }
    });
    // And entryCore.createEntryInternal should be called with mockCallingTx as the prisma client
    expect(entryCore.createEntryInternal).toHaveBeenCalledWith(
      expect.objectContaining({ account_id: actualEntryData.account_id }),
      mockCallingTx
    );
    expect(entryCore.createEntryInternal).toHaveBeenCalledWith(
      expect.objectContaining({ account_id: expectedEntryData.account_id }),
      mockCallingTx
    );

  });

});
