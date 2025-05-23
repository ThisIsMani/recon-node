import { listEntries, createEntryInternal } from '../../../src/server/core/entry';
import prisma from '../../../src/services/prisma';
import { EntryStatus, EntryType, AccountType, TransactionStatus, MerchantAccount, Account as PrismaAccount, Transaction as PrismaTransaction, Entry as PrismaEntry, Prisma } from '@prisma/client';

const mockPrismaClient = prisma as any;

describe('Entry Core Logic', () => {
  let testMerchant: MerchantAccount;
  let testAccount: PrismaAccount;
  let testTransaction: PrismaTransaction;
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(async () => {
    testMerchant = await mockPrismaClient.merchantAccount.create({
      data: { merchant_id: 'entry-core-merchant', merchant_name: 'Entry Core Test Merchant' },
    });
    testAccount = await mockPrismaClient.account.create({
      data: {
        merchant_id: testMerchant.merchant_id,
        account_name: 'Entry Core Test Account',
        account_type: AccountType.DEBIT_NORMAL,
        currency: 'USD',
      },
    });
    testTransaction = await mockPrismaClient.transaction.create({
        data: {
            merchant_id: testMerchant.merchant_id,
            status: TransactionStatus.POSTED,
        }
    });
  });

  afterAll(async () => {
    await mockPrismaClient.entry.deleteMany({});
    await mockPrismaClient.transaction.deleteMany({}); // Ensure transactions are deleted before accounts if dependent
    await mockPrismaClient.account.deleteMany({ where: { merchant_id: testMerchant.merchant_id } });
    await mockPrismaClient.merchantAccount.delete({ where: { merchant_id: testMerchant.merchant_id } });
    await mockPrismaClient.$disconnect();
  });

  beforeEach(async () => {
    await mockPrismaClient.entry.deleteMany({});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if(consoleErrorSpy) consoleErrorSpy.mockRestore();
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
      jest.spyOn(mockPrismaClient.entry, 'findMany').mockRejectedValueOnce(new Error('DB list error'));
      await expect(listEntries(testAccount.account_id, {})).rejects.toThrow('Could not retrieve entries.');
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
      expect(newEntry.amount.toString()).toBe(entryData.amount.toString());
    });

    it('should throw error if required fields are missing', async () => {
      const incompleteData = { ...validEntryData(), amount: undefined } as any; // Cast to any to allow missing field
      await expect(createEntryInternal(incompleteData))
        .rejects.toThrow('Missing required fields for internal entry creation');
    });

    it('should throw error for invalid entry_type', async () => {
      const invalidData = { ...validEntryData(), entry_type: 'INVALID_TYPE' as EntryType };
      await expect(createEntryInternal(invalidData))
        .rejects.toThrow('Invalid entry_type: INVALID_TYPE');
    });

    it('should throw error for invalid status', async () => {
      const invalidData = { ...validEntryData(), status: 'INVALID_STATUS' as EntryStatus };
      await expect(createEntryInternal(invalidData))
        .rejects.toThrow('Invalid entry status: INVALID_STATUS');
    });

    it('should throw error if account_id does not exist', async () => {
      const invalidData = { ...validEntryData(), account_id: 'non-existent-account' };
      await expect(createEntryInternal(invalidData))
        .rejects.toThrow('Account with ID non-existent-account not found for internal entry creation.');
    });

    it('should throw error if transaction_id does not exist', async () => {
      const invalidData = { ...validEntryData(), transaction_id: 'non-existent-tx' };
      await expect(createEntryInternal(invalidData))
        .rejects.toThrow('Transaction with ID non-existent-tx not found for internal entry creation.');
    });
    
    it('should throw error if transaction_id is missing (as it is mandatory)', async () => {
        const dataWithoutTx = { ...validEntryData(), transaction_id: undefined } as any; 
        await expect(createEntryInternal(dataWithoutTx))
          .rejects.toThrow('Missing required fields for internal entry creation: account_id, transaction_id, entry_type, amount, currency, status, effective_date.');
      });

    it('should throw a generic error for other database issues during creation', async () => {
      jest.spyOn(mockPrismaClient.entry, 'create').mockRejectedValueOnce(new Error('Some other DB error'));
      await expect(createEntryInternal(validEntryData())).rejects.toThrow('Could not create internal entry.');
    });

    describe('when using Prisma transaction client (tx)', () => {
      let mockTxClient: Prisma.TransactionClient;

      beforeEach(() => {
        mockTxClient = {
          account: { findUnique: jest.fn() } as any,
          transaction: { findUnique: jest.fn() } as any,
          entry: { create: jest.fn() } as any,
        } as Prisma.TransactionClient; // Cast to Prisma.TransactionClient
      });

      it('should use the provided tx client for creating an entry', async () => {
        const entryData = validEntryData();
        (mockTxClient.account.findUnique as jest.Mock).mockResolvedValue(testAccount); 
        (mockTxClient.entry.create as jest.Mock).mockResolvedValue({ ...entryData, entry_id: 'tx-entry-id', amount: new Prisma.Decimal(entryData.amount) });

        const spyPrismaAccountFindUnique = jest.spyOn(prisma.account, 'findUnique');
        const spyPrismaEntryCreate = jest.spyOn(prisma.entry, 'create');

        const newEntry = await createEntryInternal(entryData, mockTxClient);

        expect(mockTxClient.account.findUnique).toHaveBeenCalledWith({ where: { account_id: entryData.account_id } });
        expect(mockTxClient.entry.create).toHaveBeenCalledWith({
          data: {
            ...entryData,
            amount: new Prisma.Decimal(entryData.amount.toString()),
            effective_date: new Date(entryData.effective_date),
            metadata: Prisma.JsonNull, // Updated to match core logic
            discarded_at: null, 
          },
        });
        expect(spyPrismaAccountFindUnique).not.toHaveBeenCalled();
        expect(spyPrismaEntryCreate).not.toHaveBeenCalled();
        
        expect(newEntry).toBeDefined();
        expect(newEntry.entry_id).toBe('tx-entry-id');
      });

      it('should use tx client for account validation and throw if account not found via tx', async () => {
        const entryData = { ...validEntryData(), account_id: 'non-existent-via-tx' };
        (mockTxClient.account.findUnique as jest.Mock).mockResolvedValue(null);
        
        const spyPrismaAccountFindUnique = jest.spyOn(prisma.account, 'findUnique');

        await expect(createEntryInternal(entryData, mockTxClient))
          .rejects.toThrow('Account with ID non-existent-via-tx not found for internal entry creation.');
        expect(mockTxClient.account.findUnique).toHaveBeenCalledWith({ where: { account_id: 'non-existent-via-tx' } });
        expect(spyPrismaAccountFindUnique).not.toHaveBeenCalled();
      });

      it('should skip transaction_id existence check when tx is provided', async () => {
        const entryData = { ...validEntryData(), transaction_id: 'tx-might-not-exist-yet' };
        (mockTxClient.account.findUnique as jest.Mock).mockResolvedValue(testAccount);
        (mockTxClient.entry.create as jest.Mock).mockResolvedValue({ ...entryData, entry_id: 'another-tx-entry-id', amount: new Prisma.Decimal(entryData.amount) });

        await createEntryInternal(entryData, mockTxClient);

        expect(mockTxClient.transaction.findUnique).not.toHaveBeenCalled();
        expect(mockTxClient.entry.create).toHaveBeenCalled();
      });
    });
  });
});
