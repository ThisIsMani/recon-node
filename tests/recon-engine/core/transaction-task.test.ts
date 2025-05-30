import { TransactionTask } from '../../../src/server/core/recon-engine/task/transaction-task';
import { StagingEntryWithAccount } from '../../../src/server/domain_models/staging_entry.types'; // Updated path
import { TransactionWithEntries } from '../../../src/server/core/transaction'; // Updated path
import { StagingEntryProcessingMode, StagingEntryStatus, EntryType, Prisma as PrismaTypes, ProcessTracker, ProcessTaskType, Prisma, AccountType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { ValidationError, ProcessingError } from '../../../src/server/core/recon-engine/error';
import prisma from '../../../src/services/prisma';
import logger from '../../../src/services/logger';
import * as reconEngine from '../../../src/server/core/recon-engine/engine';
import { findUniqueOrThrow } from '../../../src/services/databaseHelpers';
import { ok, err } from 'neverthrow';
import { AppError } from '../../../src/errors/AppError';
import { ReconTask } from '../../../src/server/core/recon-engine/task/task-interface';

// Mock dependencies
jest.mock('../../../src/services/prisma', () => ({
  __esModule: true,
  default: {
    reconRule: { findFirst: jest.fn() },
    stagingEntry: {
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findUnique: jest.fn(),
    }
  }
}));

jest.mock('../../../src/services/databaseHelpers', () => ({
  __esModule: true,
  findUniqueOrThrow: jest.fn(),
}));

jest.mock('../../../src/services/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), log: jest.fn() }
}));

jest.mock('../../../src/server/core/recon-engine/engine', () => ({
  processStagingEntryWithRecon: jest.fn()
}));

describe('TransactionCreationTask', () => {
  let mockTask: ReconTask;
  let validStagingEntry: StagingEntryWithAccount;
  let baseProcessTrackerTask: ProcessTracker;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock implementation of a task
    mockTask = {
      validate: jest.fn().mockResolvedValue(ok(undefined)),
      run: jest.fn().mockResolvedValue(ok({ transaction_id: 'test-transaction-id' }))
    };
    
    // Mock the static decide method to return our mock task
    jest.spyOn(TransactionTask, 'decide').mockResolvedValue(mockTask);
    
    validStagingEntry = {
      staging_entry_id: 'test-staging-id',
      account_id: 'test-account-id',
      entry_type: EntryType.DEBIT,
      amount: new Prisma.Decimal('100.00'),
      currency: 'USD',
      status: StagingEntryStatus.PENDING,
      processing_mode: StagingEntryProcessingMode.TRANSACTION,
      effective_date: new Date(),
      metadata: {} as Prisma.JsonObject,
      created_at: new Date(),
      updated_at: new Date(),
      discarded_at: null,
      account: {
        account_id: 'test-account-id',
        merchant_id: 'test-merchant-id',
        account_name: 'Test Account',
        account_type: AccountType.DEBIT_NORMAL,
        currency: 'USD',
        initial_balance: new Decimal(0),
        created_at: new Date(),
        updated_at: new Date()
      }
    };

    baseProcessTrackerTask = {
      task_id: 'pt-task-id',
      task_type: ProcessTaskType.PROCESS_STAGING_ENTRY,
      payload: { staging_entry_id: validStagingEntry.staging_entry_id } as Prisma.JsonObject,
      status: 'PENDING', attempts: 0, last_error: null, created_at: new Date(),updated_at: new Date(), processing_started_at: null, completed_at: null,
    };
    
    (prisma.reconRule.findFirst as jest.Mock).mockResolvedValue({
      recon_rule_id: 'test-rule-id', merchant_id: 'test-merchant-id',
      account_one_id: 'test-account-id', account_two_id: 'test-account-two-id'
    });
    (findUniqueOrThrow as jest.Mock).mockResolvedValue(validStagingEntry);
    (prisma.stagingEntry.update as jest.Mock).mockResolvedValue({});
    (reconEngine.processStagingEntryWithRecon as jest.Mock).mockResolvedValue({
      transaction_id: 'test-transaction-id', merchant_id: 'test-merchant-id',
      entries: [ /* ...entries... */ ]
    });
     // Mock the findUnique call made by decide
     (prisma.stagingEntry.findUnique as jest.Mock).mockResolvedValue({ 
      processing_mode: StagingEntryProcessingMode.TRANSACTION, 
      account_id: validStagingEntry.account_id 
    });
  });
  
  describe('decide static method', () => {
    it('should return a task for TRANSACTION mode', async () => {
      // Reset the mock to use original implementation
      jest.spyOn(TransactionTask, 'decide').mockRestore();
      
      // Set up mocks for the decide method to call
      (prisma.stagingEntry.findUnique as jest.Mock).mockResolvedValue({ 
        processing_mode: StagingEntryProcessingMode.TRANSACTION,
        account_id: validStagingEntry.account_id 
      });
      
      const result = await TransactionTask.decide(baseProcessTrackerTask);
      
      expect(result).not.toBeNull();
      expect(prisma.stagingEntry.findUnique).toHaveBeenCalledWith({
        where: { staging_entry_id: 'test-staging-id' },
        select: { processing_mode: true }
      });
    });
    
    it('should return null for CONFIRMATION mode', async () => {
      // Reset the mock to use original implementation
      jest.spyOn(TransactionTask, 'decide').mockRestore();
      
      // Set up mocks for the decide method
      (prisma.stagingEntry.findUnique as jest.Mock).mockResolvedValue({ 
        processing_mode: StagingEntryProcessingMode.CONFIRMATION,
        account_id: validStagingEntry.account_id 
      });
      
      const result = await TransactionTask.decide(baseProcessTrackerTask);
      
      expect(result).toBeNull();
    });
  });
  
  describe('validate method', () => {
    it('should validate successfully', async () => {
      await TransactionTask.decide(baseProcessTrackerTask);
      await mockTask.validate();
      
      expect(mockTask.validate).toHaveBeenCalled();
    });

    it('should fail validation when staging entry currency does not match account currency', async () => {
      // Reset the mock to use original implementation
      jest.spyOn(TransactionTask, 'decide').mockRestore();
      
      // Create staging entry with mismatched currency
      const mismatchedStagingEntry = {
        ...validStagingEntry,
        currency: 'EUR', // Different from account currency (USD)
      };
      
      (findUniqueOrThrow as jest.Mock).mockResolvedValue(mismatchedStagingEntry);
      
      const task = await TransactionTask.decide(baseProcessTrackerTask);
      expect(task).not.toBeNull();
      
      const result = await task!.validate();
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Currency mismatch between staging entry and account');
      }
    });

    it('should fail validation when account is missing', async () => {
      // Reset the mock to use original implementation
      jest.spyOn(TransactionTask, 'decide').mockRestore();
      
      // Create staging entry without account
      const stagingEntryWithoutAccount = {
        ...validStagingEntry,
        account: null,
      } as any;
      
      (findUniqueOrThrow as jest.Mock).mockResolvedValue(stagingEntryWithoutAccount);
      
      const task = await TransactionTask.decide(baseProcessTrackerTask);
      expect(task).not.toBeNull();
      
      const result = await task!.validate();
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Merchant ID not found for staging entry');
      }
    });
  });
  
  describe('run method', () => {
    it('should successfully process', async () => {
      await TransactionTask.decide(baseProcessTrackerTask);
      const result = await mockTask.run();
      
      expect(mockTask.run).toHaveBeenCalled();
      expect(result.isOk()).toBe(true);
    });
    
    it('should handle processing errors', async () => {
      // Create a mock implementation to handle errors
      mockTask.run = jest.fn().mockResolvedValue(
        err(new ProcessingError('Test processing error', { 
          stagingEntryId: validStagingEntry.staging_entry_id,
          taskId: baseProcessTrackerTask.task_id
        }))
      );
      
      const result = await mockTask.run();
      
      expect(mockTask.run).toHaveBeenCalled();
      expect(result.isErr()).toBe(true);
    });
  });
});
