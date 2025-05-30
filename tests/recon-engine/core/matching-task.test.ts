import { MatchingTask, MatchingTaskClass } from '../../../src/server/core/recon-engine/task/matching-task';
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

describe('ExpectedEntryMatchingTask', () => {
  let validStagingEntry: StagingEntryWithAccount;
  let baseProcessTrackerTask: ProcessTracker;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    validStagingEntry = {
      staging_entry_id: 'test-staging-id',
      account_id: 'test-account-id',
      entry_type: EntryType.DEBIT,
      amount: new Prisma.Decimal('100.00'),
      currency: 'USD',
      status: StagingEntryStatus.PENDING,
      processing_mode: StagingEntryProcessingMode.CONFIRMATION,
      effective_date: new Date(),
      metadata: { order_id: 'test-order-123' } as Prisma.JsonObject,
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
      account_one_id: 'other-account-id', account_two_id: 'test-account-id'
    });
    (findUniqueOrThrow as jest.Mock).mockResolvedValue(validStagingEntry);
    (prisma.stagingEntry.update as jest.Mock).mockResolvedValue({});
    (reconEngine.processStagingEntryWithRecon as jest.Mock).mockResolvedValue({
      transaction_id: 'test-transaction-id', merchant_id: 'test-merchant-id',
      amount: new Prisma.Decimal('100.00'), currency: 'USD', status: 'POSTED', effective_date: new Date(),
      entries: [ /* ...entries... */ ]
    });
  });
  
  describe('decide static method', () => {
    it('should return a task for CONFIRMATION mode', async () => {
      // Set up mocks for the decide method to call
      (prisma.stagingEntry.findUnique as jest.Mock).mockResolvedValue({ 
        processing_mode: StagingEntryProcessingMode.CONFIRMATION,
        account_id: validStagingEntry.account_id 
      });
      
      const result = await MatchingTask.decide(baseProcessTrackerTask);
      
      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(MatchingTask);
      expect(prisma.stagingEntry.findUnique).toHaveBeenCalledWith({
        where: { staging_entry_id: 'test-staging-id' },
        select: { processing_mode: true, account_id: true }
      });
    });
    
    it('should return null for TRANSACTION mode', async () => {
      // Set up mocks for the decide method
      (prisma.stagingEntry.findUnique as jest.Mock).mockResolvedValue({ 
        processing_mode: StagingEntryProcessingMode.TRANSACTION,
        account_id: validStagingEntry.account_id 
      });
      
      const result = await MatchingTask.decide(baseProcessTrackerTask);
      
      expect(result).toBeNull();
    });
    
    it('should return null if staging entry not found', async () => {
      (prisma.stagingEntry.findUnique as jest.Mock).mockResolvedValue(null);
      
      const result = await MatchingTask.decide(baseProcessTrackerTask);
      
      expect(result).toBeNull();
    });
    
    it('should return null if staging_entry_id is missing in payload', async () => {
      const taskWithoutPayload = {
        ...baseProcessTrackerTask,
        payload: {} as Prisma.JsonObject
      };
      
      const result = await MatchingTask.decide(taskWithoutPayload);
      
      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('missing staging_entry_id'));
    });
    
    it('should handle errors gracefully', async () => {
      (prisma.stagingEntry.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));
      
      const result = await MatchingTask.decide(baseProcessTrackerTask);
      
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('DB error', expect.any(Object));
    });
  });
  
  describe('validate method', () => {
    let matchingTask: MatchingTask;
    
    beforeEach(async () => {
      (prisma.stagingEntry.findUnique as jest.Mock).mockResolvedValue({ 
        processing_mode: StagingEntryProcessingMode.CONFIRMATION,
        account_id: validStagingEntry.account_id 
      });
      const task = await MatchingTask.decide(baseProcessTrackerTask);
      matchingTask = task as MatchingTask;
    });
    
    it('should validate successfully with valid staging entry', async () => {
      const result = await matchingTask.validate();
      
      expect(result.isOk()).toBe(true);
      expect(prisma.reconRule.findFirst).toHaveBeenCalled();
    });
    
    it('should fail validation if staging entry is not initialized', async () => {
      // Create a task without proper initialization
      const uninitializedTask = new MatchingTask(baseProcessTrackerTask);
      
      const result = await uninitializedTask.validate();
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ProcessingError);
        expect(result.error.message).toContain('Task not properly initialized');
      }
    });
    
    it('should fail validation if account_id is missing', async () => {
      const stagingEntryWithoutAccount = { ...validStagingEntry, account_id: null };
      (findUniqueOrThrow as jest.Mock).mockResolvedValue(stagingEntryWithoutAccount);
      
      const task = await MatchingTask.decide(baseProcessTrackerTask);
      const result = await (task as MatchingTask).validate();
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('missing account_id');
      }
    });
    
    it('should fail validation if merchant_id is missing', async () => {
      const stagingEntryWithoutMerchant = { 
        ...validStagingEntry, 
        account: { ...validStagingEntry.account, merchant_id: null as any }
      };
      (findUniqueOrThrow as jest.Mock).mockResolvedValue(stagingEntryWithoutMerchant);
      
      const task = await MatchingTask.decide(baseProcessTrackerTask);
      const result = await (task as MatchingTask).validate();
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Merchant ID not found');
      }
    });
    
    it('should fail validation if currency mismatches', async () => {
      const stagingEntryWithCurrencyMismatch = { 
        ...validStagingEntry, 
        currency: 'EUR',
        account: { ...validStagingEntry.account, currency: 'USD' }
      };
      (findUniqueOrThrow as jest.Mock).mockResolvedValue(stagingEntryWithCurrencyMismatch);
      
      const task = await MatchingTask.decide(baseProcessTrackerTask);
      const result = await (task as MatchingTask).validate();
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Currency mismatch');
      }
      expect(prisma.stagingEntry.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { staging_entry_id: 'test-staging-id' },
        data: expect.objectContaining({
          status: 'NEEDS_MANUAL_REVIEW'
        })
      }));
    });
    
    it('should fail validation if order_id is missing in metadata', async () => {
      const stagingEntryWithoutOrderId = { 
        ...validStagingEntry, 
        metadata: {} as Prisma.JsonObject
      };
      (findUniqueOrThrow as jest.Mock).mockResolvedValue(stagingEntryWithoutOrderId);
      
      const task = await MatchingTask.decide(baseProcessTrackerTask);
      const result = await (task as MatchingTask).validate();
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Missing order_id');
      }
    });
    
    it('should fail validation if no recon rule exists', async () => {
      (prisma.reconRule.findFirst as jest.Mock).mockResolvedValue(null);
      
      const result = await matchingTask.validate();
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('No reconciliation rule found');
      }
    });
  });
  
  describe('run method', () => {
    let matchingTask: MatchingTask;
    
    beforeEach(async () => {
      (prisma.stagingEntry.findUnique as jest.Mock).mockResolvedValue({ 
        processing_mode: StagingEntryProcessingMode.CONFIRMATION,
        account_id: validStagingEntry.account_id 
      });
      const task = await MatchingTask.decide(baseProcessTrackerTask);
      matchingTask = task as MatchingTask;
    });
    
    it('should successfully process matching', async () => {
      const result = await matchingTask.run();
      
      expect(result.isOk()).toBe(true);
      expect(reconEngine.processStagingEntryWithRecon).toHaveBeenCalledWith(
        validStagingEntry,
        'test-merchant-id'
      );
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Successfully matched'));
    });
    
    it('should handle NoMatchFoundError', async () => {
      const noMatchError = new Error('No match found');
      noMatchError.name = 'NoMatchFoundError';
      (reconEngine.processStagingEntryWithRecon as jest.Mock).mockRejectedValue(noMatchError);
      
      const result = await matchingTask.run();
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ProcessingError);
        expect(result.error.message).toContain('No matching entry found');
        expect(result.error.details).toHaveProperty('errorType', 'no_match');
      }
      expect(logger.warn).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        context: 'MatchingTask.run - NoMatchFoundError'
      }));
    });
    
    it('should handle general errors', async () => {
      (reconEngine.processStagingEntryWithRecon as jest.Mock).mockRejectedValue(new Error('General error'));
      
      const result = await matchingTask.run();
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ProcessingError);
        expect(result.error.message).toContain('Failed to match staging entry');
        expect(result.error.message).toContain('General error');
      }
      expect(logger.error).toHaveBeenCalled();
    });
    
    it('should run validation before processing', async () => {
      // Mock validation to fail
      jest.spyOn(matchingTask, 'validate').mockResolvedValue(err(new ValidationError('Validation failed')));
      
      const result = await matchingTask.run();
      
      expect(result.isErr()).toBe(true);
      expect(matchingTask.validate).toHaveBeenCalled();
      expect(reconEngine.processStagingEntryWithRecon).not.toHaveBeenCalled();
    });
  });
});
