const { listEntries, createEntryInternal } = require('../../../src/server/core/entry/index');
const prisma = require('../../../src/services/prisma');
const { EntryStatus, EntryType, AccountType, TransactionStatus } = require('@prisma/client'); // Import enums

describe('Entry Core Logic', () => {
  let testMerchant;
  let testAccount;
  let testTransaction;
  let consoleErrorSpy;

  beforeAll(async () => {
    // Create a merchant and an account for testing
    testMerchant = await prisma.merchantAccount.create({
      data: { merchant_id: 'entry-core-merchant', merchant_name: 'Entry Core Test Merchant' },
    });
    testAccount = await prisma.account.create({
      data: {
        merchant_id: testMerchant.merchant_id,
        account_name: 'Entry Core Test Account',
        account_type: AccountType.DEBIT_NORMAL,
        currency: 'USD',
      },
    });
    testTransaction = await prisma.transaction.create({
        data: {
            merchant_id: testMerchant.merchant_id,
            status: TransactionStatus.POSTED,
            // entries will be linked in tests
        }
    });
  });

  afterAll(async () => {
    // Clean up: delete in reverse order of creation due to dependencies
    await prisma.entry.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.merchantAccount.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear entries before each test
    await prisma.entry.deleteMany({});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('listEntries', () => {
    it('should return an empty array if no entries exist for the account', async () => {
      const entries = await listEntries(testAccount.account_id, {});
      expect(entries).toEqual([]);
    });

    it('should list entries for a given account', async () => {
      await createEntryInternal({
        account_id: testAccount.account_id,
        transaction_id: testTransaction.transaction_id,
        entry_type: EntryType.DEBIT,
        amount: 100.00,
        currency: 'USD',
        status: EntryStatus.POSTED,
        effective_date: new Date(),
      });
      const entries = await listEntries(testAccount.account_id, {});
      expect(entries.length).toBe(1);
      expect(entries[0].account_id).toBe(testAccount.account_id);
    });

    it('should filter entries by status', async () => {
      await createEntryInternal({
        account_id: testAccount.account_id,
        transaction_id: testTransaction.transaction_id,
        entry_type: EntryType.DEBIT,
        amount: 100.00,
        currency: 'USD',
        status: EntryStatus.POSTED,
        effective_date: new Date(),
      });
      await createEntryInternal({
        account_id: testAccount.account_id,
        transaction_id: testTransaction.transaction_id,
        entry_type: EntryType.CREDIT,
        amount: 50.00,
        currency: 'USD',
        status: EntryStatus.EXPECTED,
        effective_date: new Date(),
      });

      const postedEntries = await listEntries(testAccount.account_id, { status: EntryStatus.POSTED });
      expect(postedEntries.length).toBe(1);
      expect(postedEntries[0].status).toBe(EntryStatus.POSTED);

      const expectedEntries = await listEntries(testAccount.account_id, { status: EntryStatus.EXPECTED });
      expect(expectedEntries.length).toBe(1);
      expect(expectedEntries[0].status).toBe(EntryStatus.EXPECTED);
    });

    it('should throw an error for database issues during listing', async () => {
      jest.spyOn(prisma.entry, 'findMany').mockRejectedValueOnce(new Error('DB list error'));
      try {
        await listEntries(testAccount.account_id, {});
      } catch (error) {
        expect(error.message).toBe('Could not retrieve entries.');
      }
      // jest.restoreAllMocks(); // Will be handled by afterEach
    });
  });

  describe('createEntryInternal', () => {
    const validEntryData = () => ({
      account_id: testAccount.account_id,
      transaction_id: testTransaction.transaction_id,
      entry_type: EntryType.CREDIT,
      amount: 123.45,
      currency: 'USD',
      status: EntryStatus.POSTED,
      effective_date: new Date().toISOString(),
    });

    it('should create an entry successfully with valid data', async () => {
      const entryData = validEntryData();
      const newEntry = await createEntryInternal(entryData);
      expect(newEntry).toBeDefined();
      expect(newEntry.account_id).toBe(entryData.account_id);
      expect(newEntry.transaction_id).toBe(entryData.transaction_id);
      expect(newEntry.amount.toString()).toBe(entryData.amount.toString()); // Compare as strings due to Decimal
    });

    it('should throw error if required fields are missing', async () => {
      const incompleteData = { ...validEntryData(), amount: undefined };
      await expect(createEntryInternal(incompleteData))
        .rejects.toThrow('Missing required fields for internal entry creation');
    });

    it('should throw error for invalid entry_type', async () => {
      const invalidData = { ...validEntryData(), entry_type: 'INVALID_TYPE' };
      await expect(createEntryInternal(invalidData))
        .rejects.toThrow('Invalid entry_type: INVALID_TYPE');
    });

    it('should throw error for invalid status', async () => {
      const invalidData = { ...validEntryData(), status: 'INVALID_STATUS' };
      await expect(createEntryInternal(invalidData))
        .rejects.toThrow('Invalid entry status: INVALID_STATUS');
    });

    it('should throw error if account_id does not exist', async () => {
      const invalidData = { ...validEntryData(), account_id: 'non-existent-account' };
      await expect(createEntryInternal(invalidData))
        .rejects.toThrow('Account with ID non-existent-account not found');
    });

    it('should throw error if transaction_id does not exist', async () => {
      const invalidData = { ...validEntryData(), transaction_id: 'non-existent-tx' };
      await expect(createEntryInternal(invalidData))
        .rejects.toThrow('Transaction with ID non-existent-tx not found');
    });
    
    it('should throw error if transaction_id is missing (as it is mandatory)', async () => {
        const dataWithoutTx = { ...validEntryData(), transaction_id: undefined };
        // Prisma will throw an error because transaction_id is not optional in the schema
        // The exact error message might vary based on Prisma version, so we check for a generic one.
        await expect(createEntryInternal(dataWithoutTx))
          .rejects.toThrow('Could not create internal entry.'); 
          // This is because Prisma's `create` will fail due to the missing non-nullable `transaction_id`.
          // The function `createEntryInternal` catches this and throws 'Could not create internal entry.'
      });

    it('should throw a generic error for other database issues during creation', async () => {
      jest.spyOn(prisma.entry, 'create').mockRejectedValueOnce(new Error('Some other DB error'));
      try {
        await createEntryInternal(validEntryData());
      } catch (error) {
        expect(error.message).toBe('Could not create internal entry.');
      }
    });

    // Tests for when 'tx' (Prisma transaction client) is provided
    describe('when using Prisma transaction client (tx)', () => {
      let mockTxClient;

      beforeEach(() => {
        // Mock a Prisma transaction client
        mockTxClient = {
          account: {
            findUnique: jest.fn(),
          },
          transaction: {
            findUnique: jest.fn(),
          },
          entry: {
            create: jest.fn(),
          },
        };
      });

      it('should use the provided tx client for creating an entry', async () => {
        const entryData = validEntryData();
        mockTxClient.account.findUnique.mockResolvedValue(testAccount); 
        // mockTxClient.transaction.findUnique.mockResolvedValue(testTransaction); // Not needed here as tx existence check is skipped
        mockTxClient.entry.create.mockResolvedValue({ ...entryData, entry_id: 'tx-entry-id' });

        const spyPrismaAccountFindUnique = jest.spyOn(prisma.account, 'findUnique');
        const spyPrismaEntryCreate = jest.spyOn(prisma.entry, 'create');

        const newEntry = await createEntryInternal(entryData, mockTxClient);

        expect(mockTxClient.account.findUnique).toHaveBeenCalledWith({ where: { account_id: entryData.account_id } });
        expect(mockTxClient.entry.create).toHaveBeenCalledWith({
          data: {
            ...entryData,
            effective_date: new Date(entryData.effective_date), // Ensure date object
          },
        });
        // Global prisma client should not have been called for these operations
        expect(spyPrismaAccountFindUnique).not.toHaveBeenCalled();
        expect(spyPrismaEntryCreate).not.toHaveBeenCalled();
        
        expect(newEntry).toBeDefined();
        expect(newEntry.entry_id).toBe('tx-entry-id');
      });

      it('should use tx client for account validation and throw if account not found via tx', async () => {
        const entryData = { ...validEntryData(), account_id: 'non-existent-via-tx' };
        mockTxClient.account.findUnique.mockResolvedValue(null); // Account does not exist via tx
        
        const spyPrismaAccountFindUnique = jest.spyOn(prisma.account, 'findUnique');

        await expect(createEntryInternal(entryData, mockTxClient))
          .rejects.toThrow('Account with ID non-existent-via-tx not found');
        expect(mockTxClient.account.findUnique).toHaveBeenCalledWith({ where: { account_id: 'non-existent-via-tx' } });
        expect(spyPrismaAccountFindUnique).not.toHaveBeenCalled();
      });

      it('should skip transaction_id existence check when tx is provided', async () => {
        // This test verifies that the specific 'Transaction with ID ... not found' error,
        // which comes from the `if (!tx && transaction_id)` block, is NOT thrown.
        // The actual FK constraint would be handled by the DB if the tx_id is invalid during the $transaction commit.
        const entryData = { ...validEntryData(), transaction_id: 'tx-might-not-exist-yet' };
        mockTxClient.account.findUnique.mockResolvedValue(testAccount); // Account exists
        // We don't mock transaction.findUnique on mockTxClient because it shouldn't be called.
        mockTxClient.entry.create.mockResolvedValue({ ...entryData, entry_id: 'another-tx-entry-id' });

        await createEntryInternal(entryData, mockTxClient);

        expect(mockTxClient.transaction.findUnique).not.toHaveBeenCalled();
        expect(mockTxClient.entry.create).toHaveBeenCalled();
      });
    });
  });
});
