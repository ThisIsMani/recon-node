import {
  StagingEntryWithAccount,
} from '../../../src/server/domain_models/staging_entry.types'; // Updated path
import {
  TransactionWithEntries,
} from '../../../src/server/core/transaction'; // Updated path
import {
  StagingEntryStatusUpdate
} from '../../../src/server/api_models/staging_entry.types'; // Updated path
import { StagingEntryStatus, AccountType, TransactionStatus, EntryStatus, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('Recon Engine Types', () => {
  describe('StagingEntryWithAccount', () => {
    test('should conform to the interface structure', () => {
      const stagingEntryWithAccount: StagingEntryWithAccount = {
        staging_entry_id: 'staging-123',
        account_id: 'account-123',
        entry_type: 'CREDIT',
        amount: expect.any(Object), // Prisma.Decimal
        currency: 'USD',
        status: StagingEntryStatus.PENDING,
        effective_date: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {},
        discarded_at: null,
        processing_mode: 'CONFIRMATION',
        account: {
          account_id: 'account-123',
          merchant_id: 'merchant-123',
          account_name: 'Test Account',
          account_type: AccountType.DEBIT_NORMAL,
          currency: 'USD',
          initial_balance: new Decimal(0),
          created_at: new Date(),
          updated_at: new Date()
        }
      };

      // Verify the structure
      expect(stagingEntryWithAccount).toHaveProperty('staging_entry_id');
      expect(stagingEntryWithAccount).toHaveProperty('account_id');
      expect(stagingEntryWithAccount).toHaveProperty('account');
      expect(stagingEntryWithAccount.account).toHaveProperty('account_id');
      expect(stagingEntryWithAccount.account).toHaveProperty('merchant_id');
    });

    test('should accept null for optional account property', () => {
      const stagingEntryWithAccount: StagingEntryWithAccount = {
        staging_entry_id: 'staging-123',
        account_id: 'account-123',
        entry_type: 'CREDIT',
        amount: expect.any(Object), // Prisma.Decimal
        currency: 'USD',
        status: StagingEntryStatus.PENDING,
        effective_date: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {},
        discarded_at: null,
        processing_mode: 'CONFIRMATION',
        account: undefined // Optional property
      };

      expect(stagingEntryWithAccount).toHaveProperty('staging_entry_id');
      expect(stagingEntryWithAccount.account).toBeUndefined();
    });
  });

  describe('TransactionWithEntries', () => {
    test('should conform to the interface structure', () => {
      const transactionWithEntries: TransactionWithEntries = {
        transaction_id: 'txn-123',
        merchant_id: 'merchant-123',
        status: TransactionStatus.EXPECTED,
        logical_transaction_id: 'logical-123',
        version: 1,
        amount: new Prisma.Decimal(100),
        currency: 'USD',
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {},
        discarded_at: null,
        entries: [
          {
            entry_id: 'entry-123',
            transaction_id: 'txn-123',
            account_id: 'account-123',
            entry_type: 'DEBIT',
            amount: expect.any(Object), // Prisma.Decimal
            currency: 'USD',
            status: EntryStatus.EXPECTED,
            effective_date: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
            metadata: {},
            discarded_at: null
          },
          {
            entry_id: 'entry-124',
            transaction_id: 'txn-123',
            account_id: 'account-124',
            entry_type: 'CREDIT',
            amount: expect.any(Object), // Prisma.Decimal
            currency: 'USD',
            status: EntryStatus.EXPECTED,
            effective_date: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
            metadata: {},
            discarded_at: null
          }
        ]
      };

      // Verify the structure
      expect(transactionWithEntries).toHaveProperty('transaction_id');
      expect(transactionWithEntries).toHaveProperty('merchant_id');
      expect(transactionWithEntries).toHaveProperty('entries');
      expect(Array.isArray(transactionWithEntries.entries)).toBe(true);
      if (transactionWithEntries.entries) {
        expect(transactionWithEntries.entries.length).toBe(2);
        expect(transactionWithEntries.entries[0]).toHaveProperty('entry_id');
        expect(transactionWithEntries.entries[0]).toHaveProperty('transaction_id');
        expect(transactionWithEntries.entries[0].transaction_id).toBe(transactionWithEntries.transaction_id);
      }
    });

    // Removed test case for undefined entries as 'entries' is now mandatory in TransactionWithEntries
    // test('should accept undefined for optional entries property', () => {
    //   const transactionWithEntries: TransactionWithEntries = {
    //     transaction_id: 'txn-123',
    //     merchant_id: 'merchant-123',
    //     status: TransactionStatus.EXPECTED,
    //     logical_transaction_id: 'logical-123',
    //     version: 1,
    //     created_at: new Date(),
    //     updated_at: new Date(),
    //     metadata: {},
    //     discarded_at: null,
    //     entries: undefined // This was causing the error
    //   };

    //   expect(transactionWithEntries).toHaveProperty('transaction_id');
    //   expect(transactionWithEntries.entries).toBeUndefined();
    // });
  });

  describe('StagingEntryStatusUpdate', () => {
    test('should conform to the interface structure with required fields', () => {
      const statusUpdate: StagingEntryStatusUpdate = {
        status: StagingEntryStatus.PROCESSED
      };

      expect(statusUpdate).toHaveProperty('status');
      expect(statusUpdate.status).toBe(StagingEntryStatus.PROCESSED);
    });

    test('should accept optional metadata property', () => {
      const statusUpdate: StagingEntryStatusUpdate = {
        status: StagingEntryStatus.NEEDS_MANUAL_REVIEW,
        metadata: {
          error: 'No matching entry found',
          error_type: 'ValidationError'
        }
      };

      expect(statusUpdate).toHaveProperty('status');
      expect(statusUpdate).toHaveProperty('metadata');
      expect(statusUpdate.metadata).toHaveProperty('error');
      expect(statusUpdate.metadata).toHaveProperty('error_type');
    });

    test('should accept optional discarded_at property', () => {
      const now = new Date();
      const statusUpdate: StagingEntryStatusUpdate = {
        status: StagingEntryStatus.PROCESSED,
        discarded_at: now
      };

      expect(statusUpdate).toHaveProperty('status');
      expect(statusUpdate).toHaveProperty('discarded_at');
      expect(statusUpdate.discarded_at).toBe(now);
    });

    test('should accept null for discarded_at property', () => {
      const statusUpdate: StagingEntryStatusUpdate = {
        status: StagingEntryStatus.PROCESSED,
        discarded_at: null
      };

      expect(statusUpdate).toHaveProperty('status');
      expect(statusUpdate).toHaveProperty('discarded_at');
      expect(statusUpdate.discarded_at).toBeNull();
    });
  });
});
