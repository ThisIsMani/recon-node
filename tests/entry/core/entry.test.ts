// Mock prisma first
jest.mock('../../../src/services/prisma');

import { listEntries, createEntryInternal, CreateEntryInternalData } from '../../../src/server/core/entry';
import prisma from '../../../src/services/prisma'; // This will now be the mock
import { EntryStatus, EntryType, AccountType, TransactionStatus, MerchantAccount, Account as PrismaAccount, Transaction as PrismaTransaction, Entry as PrismaEntryPrisma, Prisma } from '@prisma/client';
import { Entry } from '../../../src/server/domain_models/entry.types';
import logger from '../../../src/services/logger';

jest.mock('../../../src/services/logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(), query: jest.fn(),
  },
}));

describe('Entry Core Logic', () => {
  let testMerchant: MerchantAccount;
  let testAccount: PrismaAccount;
  let testTransaction: PrismaTransaction;

  beforeAll(async () => {
    // Use type assertion for the test merchant to work around TypeScript errors
    const merchantData = { 
        merchant_id: 'entry-core-merchant', 
        merchant_name: 'Entry Core Test Merchant', 
        created_at: new Date(), 
        updated_at: new Date() 
    } as unknown as MerchantAccount;
    (prisma.merchantAccount.create as jest.Mock).mockResolvedValueOnce(merchantData);
    testMerchant = await prisma.merchantAccount.create({data: merchantData}); 

    const accountData: PrismaAccount = { 
        account_id: 'entry-core-account',
        merchant_id: testMerchant.merchant_id, 
        account_name: 'Entry Core Test Account', 
        account_type: AccountType.DEBIT_NORMAL, 
        currency: 'USD', 
        created_at: new Date(), 
        updated_at: new Date() 
    };
    (prisma.account.create as jest.Mock).mockResolvedValueOnce(accountData);
    testAccount = await prisma.account.create({data: accountData}); 

    // Create a separate object for the mock response vs what we pass to create
    const transactionCreateData = {
        transaction_id: 'entry-core-tx', 
        merchant_id: testMerchant.merchant_id, 
        status: TransactionStatus.POSTED,
        logical_transaction_id: '', 
        version: 1, 
        metadata: Prisma.JsonNull // This is what Prisma actually expects
    };
    
    const transactionResponseData: PrismaTransaction = { 
        ...transactionCreateData,
        created_at: new Date(), 
        updated_at: new Date(), 
        discarded_at: null,
        metadata: Prisma.JsonNull as any // Cast for test object
    };
    
    (prisma.transaction.create as jest.Mock).mockResolvedValueOnce(transactionResponseData);
    testTransaction = await prisma.transaction.create({data: transactionCreateData}) as PrismaTransaction; 
  });

  afterAll(async () => {
    (prisma.entry.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
    (prisma.transaction.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
    (prisma.account.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
    (prisma.merchantAccount.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
  });

  beforeEach(() => { 
    jest.clearAllMocks();
    (logger.error as jest.Mock).mockClear();
    (prisma.account.findUnique as jest.Mock).mockImplementation(async ({ where }) => {
      if (where.account_id === testAccount.account_id) return testAccount;
      return null;
    });
    (prisma.transaction.findUnique as jest.Mock).mockImplementation(async ({ where }) => {
      if (where.transaction_id === testTransaction.transaction_id) return testTransaction;
      return null;
    });
  });

  describe('listEntries', () => {
    it('should return an empty array if no entries exist for the account', async () => {
      (prisma.entry.findMany as jest.Mock).mockResolvedValueOnce([]);
      const entries = await listEntries(testAccount.account_id, {});
      expect(entries).toEqual([]);
    });

    it('should list entries for a given account', async () => {
      const mockDate = new Date();
      const entry1Data: PrismaEntryPrisma = { entry_id: 'entry1', account_id: testAccount.account_id, transaction_id: testTransaction.transaction_id, entry_type: EntryType.DEBIT, amount: new Prisma.Decimal(100.00), currency: 'USD', status: EntryStatus.POSTED, effective_date: mockDate, created_at: mockDate, updated_at: mockDate, metadata: Prisma.JsonNull as any, discarded_at: null };
      (prisma.entry.findMany as jest.Mock).mockResolvedValueOnce([entry1Data]);
      
      const entries = await listEntries(testAccount.account_id, {});
      expect(entries.length).toBe(1);
      const entry = entries[0] as Entry;
      expect(entry.account_id).toBe(testAccount.account_id);
      expect(entry).toHaveProperty('created_at');
      expect(entry).toHaveProperty('updated_at');
    });

    it('should filter entries by status', async () => {
      const date1 = new Date();
      const date2 = new Date();
      const postedEntry: PrismaEntryPrisma = { entry_id: 'entry1', account_id: testAccount.account_id, transaction_id: testTransaction.transaction_id, entry_type: EntryType.DEBIT, amount: new Prisma.Decimal(100.00), currency: 'USD', status: EntryStatus.POSTED, effective_date: date1, created_at: date1, updated_at: date1, metadata: Prisma.JsonNull as any, discarded_at: null };
      const expectedEntry: PrismaEntryPrisma = { entry_id: 'entry2', account_id: testAccount.account_id, transaction_id: testTransaction.transaction_id, entry_type: EntryType.CREDIT, amount: new Prisma.Decimal(50.00), currency: 'USD', status: EntryStatus.EXPECTED, effective_date: date2, created_at: date2, updated_at: date2, metadata: Prisma.JsonNull as any, discarded_at: null };

      (prisma.entry.findMany as jest.Mock)
        .mockImplementationOnce(async ({ where }: { where: Prisma.EntryWhereInput }) => {
          if (where.status === EntryStatus.POSTED) return [postedEntry];
          return [];
        })
        .mockImplementationOnce(async ({ where }: { where: Prisma.EntryWhereInput }) => {
          if (where.status === EntryStatus.EXPECTED) return [expectedEntry];
          return [];
        });

      const postedEntries = await listEntries(testAccount.account_id, { status: EntryStatus.POSTED });
      expect(postedEntries.length).toBe(1);
      expect((postedEntries[0] as Entry).status).toBe(EntryStatus.POSTED);

      const expectedEntriesList = await listEntries(testAccount.account_id, { status: EntryStatus.EXPECTED });
      expect(expectedEntriesList.length).toBe(1);
      expect((expectedEntriesList[0] as Entry).status).toBe(EntryStatus.EXPECTED);
    });

    it('should throw an error for database issues during listing', async () => {
      const dbError = new Error('DB list error');
      (prisma.entry.findMany as jest.Mock).mockRejectedValueOnce(dbError);
      await expect(listEntries(testAccount.account_id, {})).rejects.toThrow('Could not retrieve entries.');
      expect(logger.error).toHaveBeenCalledWith(dbError, { context: `Error fetching entries for account ${testAccount.account_id}` });
    });
  });

  describe('createEntryInternal', () => {
    // Create a typed function that returns the right structure
    const validEntryData = (): CreateEntryInternalData => ({
      account_id: testAccount.account_id,
      transaction_id: testTransaction.transaction_id,
      entry_type: EntryType.CREDIT,
      amount: 123.45,
      currency: 'USD',
      status: EntryStatus.POSTED,
      effective_date: new Date().toISOString(),
      metadata: undefined // Use undefined instead which is acceptable for Prisma
    });

    it('should create an entry successfully with valid data', async () => {
      const entryData = validEntryData();
      const mockDate = new Date();
      (prisma.entry.create as jest.Mock).mockResolvedValueOnce({
        entry_id: 'test-entry-id', 
        account_id: entryData.account_id,
        transaction_id: entryData.transaction_id,
        entry_type: entryData.entry_type,
        amount: new Prisma.Decimal(entryData.amount.toString()),
        currency: entryData.currency,
        status: entryData.status,
        effective_date: new Date(entryData.effective_date as string),
        created_at: mockDate, 
        updated_at: mockDate,
        metadata: entryData.metadata === null ? (Prisma.JsonNull as any) : entryData.metadata,
        discarded_at: null
      } as PrismaEntryPrisma);

      const newEntry: Entry = await createEntryInternal(entryData);
      expect(newEntry).toBeDefined();
      expect(newEntry.account_id).toBe(entryData.account_id);
      expect(newEntry.transaction_id).toBe(entryData.transaction_id);
      expect(newEntry.amount.toString()).toBe(entryData.amount.toString());
      expect(newEntry.created_at).toEqual(mockDate);
      expect(newEntry.updated_at).toEqual(mockDate);
    });

    it('should throw error if required fields are missing', async () => {
      const incompleteData = { ...validEntryData(), amount: undefined } as any; 
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
      (prisma.account.findUnique as jest.Mock).mockResolvedValueOnce(null);
      await expect(createEntryInternal(invalidData))
        .rejects.toThrow("Account with identifier 'non-existent-account' not found.");
    });

    it('should throw error if transaction_id does not exist', async () => {
      const invalidData = { ...validEntryData(), transaction_id: 'non-existent-tx' };
      (prisma.transaction.findUnique as jest.Mock).mockResolvedValueOnce(null);
      await expect(createEntryInternal(invalidData))
        .rejects.toThrow("Transaction with identifier 'non-existent-tx' not found.");
    });
    
    it('should throw error if transaction_id is missing (as it is mandatory)', async () => {
        const dataWithoutTx = { ...validEntryData(), transaction_id: undefined } as any; 
        await expect(createEntryInternal(dataWithoutTx))
          .rejects.toThrow('Missing required fields for internal entry creation: account_id, transaction_id, entry_type, amount, currency, status, effective_date.');
      });

    it('should throw a generic error for other database issues during creation', async () => {
      const dbError = new Error('Some other DB error');
      (prisma.entry.create as jest.Mock).mockRejectedValueOnce(dbError);
      await expect(createEntryInternal(validEntryData())).rejects.toThrow('Could not create internal entry.');
      expect(logger.error).toHaveBeenCalledWith(dbError, { context: `Error creating internal entry for account ${testAccount.account_id}` });
    });

    describe('when using Prisma transaction client (tx)', () => {
      let mockTxClient: Prisma.TransactionClient;

      beforeEach(() => {
        mockTxClient = {
          account: { findUnique: jest.fn() },
          transaction: { findUnique: jest.fn() },
          entry: { create: jest.fn() },
        } as unknown as Prisma.TransactionClient;
      });

      it('should use the provided tx client for creating an entry', async () => {
        const entryData = validEntryData();
        (mockTxClient.account.findUnique as jest.Mock).mockResolvedValue(testAccount); 
        (mockTxClient.entry.create as jest.Mock).mockResolvedValue({ ...entryData, entry_id: 'tx-entry-id', amount: new Prisma.Decimal(entryData.amount), effective_date: new Date(entryData.effective_date as string), created_at: new Date(), updated_at: new Date(), metadata: entryData.metadata === null ? (Prisma.JsonNull as any) : entryData.metadata, discarded_at: null } as PrismaEntryPrisma);

        const newEntry = await createEntryInternal(entryData, mockTxClient);

        expect(mockTxClient.account.findUnique).toHaveBeenCalledWith({ where: { account_id: entryData.account_id } });
        expect(mockTxClient.entry.create).toHaveBeenCalledWith({
          data: {
            account_id: entryData.account_id,
            transaction_id: entryData.transaction_id,
            entry_type: entryData.entry_type,
            amount: new Prisma.Decimal(entryData.amount.toString()),
            currency: entryData.currency,
            status: entryData.status,
            effective_date: new Date(entryData.effective_date as string),
            metadata: Prisma.JsonNull, // Use Prisma.JsonNull directly here for the proper input type
            discarded_at: null, 
          },
        });
        
        expect(newEntry).toBeDefined();
        expect(newEntry.entry_id).toBe('tx-entry-id');
      });

      it('should use tx client for account validation and throw if account not found via tx', async () => {
        const entryData = { ...validEntryData(), account_id: 'non-existent-via-tx' };
        (mockTxClient.account.findUnique as jest.Mock).mockResolvedValue(null);
        
        await expect(createEntryInternal(entryData, mockTxClient))
          .rejects.toThrow("Account with identifier 'non-existent-via-tx' not found.");
        expect(mockTxClient.account.findUnique).toHaveBeenCalledWith({ where: { account_id: 'non-existent-via-tx' } });
      });

      it('should skip transaction_id existence check when tx is provided', async () => {
        const entryData = { ...validEntryData(), transaction_id: 'tx-might-not-exist-yet' };
        (mockTxClient.account.findUnique as jest.Mock).mockResolvedValue(testAccount);
        (mockTxClient.entry.create as jest.Mock).mockResolvedValue({ ...entryData, entry_id: 'another-tx-entry-id', amount: new Prisma.Decimal(entryData.amount), effective_date: new Date(entryData.effective_date as string), created_at: new Date(), updated_at: new Date(), metadata: entryData.metadata === null ? (Prisma.JsonNull as any) : entryData.metadata, discarded_at: null } as PrismaEntryPrisma);

        await createEntryInternal(entryData, mockTxClient);

        expect(mockTxClient.transaction.findUnique).not.toHaveBeenCalled();
        expect(mockTxClient.entry.create).toHaveBeenCalled();
      });
    });
  });
});
