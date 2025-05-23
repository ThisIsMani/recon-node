// Mock dependencies first, before any imports
jest.mock('../../../src/services/prisma');
jest.mock('../../../src/services/logger');
jest.mock('../../../src/server/core/recon-engine/engine');

import { StagingEntryProcessingMode, ProcessTaskType, ProcessTaskStatus, AccountType } from '@prisma/client';
import { TransactionTask, TransactionTaskClass } from '../../../src/server/core/recon-engine/task/transaction-task';
import { processStagingEntryWithRecon } from '../../../src/server/core/recon-engine/engine';
import prisma from '../../../src/services/prisma';
import logger from '../../../src/services/logger';
import { findUniqueOrThrow } from '../../../src/services/databaseHelpers';
import { ProcessingError, ValidationError } from '../../../src/server/core/recon-engine/error';

// Mock findUniqueOrThrow
jest.mock('../../../src/services/databaseHelpers', () => ({
  findUniqueOrThrow: jest.fn()
}));

describe('TransactionTask', () => {
  // Mock date for consistency
  const mockDate = new Date('2025-05-23T12:00:00Z');
  
  // Mock staging entry
  const mockStagingEntry = {
    staging_entry_id: 'staging-123',
    account_id: 'account-123',
    processing_mode: StagingEntryProcessingMode.TRANSACTION,
    amount: 100.00,
    currency: 'USD',
    metadata: { order_id: 'order-123' },
    created_at: mockDate,
    updated_at: mockDate,
    account: {
      account_id: 'account-123',
      merchant_id: 'merchant-123',
      account_name: 'Test Account',
      account_type: AccountType.DEBIT_NORMAL,
      currency: 'USD',
      created_at: mockDate,
      updated_at: mockDate
    }
  };

  // Mock process tracker task
  const mockProcessTrackerTask = {
    task_id: 'task-123',
    task_type: ProcessTaskType.PROCESS_STAGING_ENTRY,
    status: ProcessTaskStatus.PENDING,
    payload: { staging_entry_id: 'staging-123' },
    attempts: 0,
    created_at: mockDate,
    updated_at: mockDate,
    processing_started_at: null,
    completed_at: null,
    last_error: null
  };

  // Mock successful transaction result
  const mockTransactionResult = {
    transaction_id: 'transaction-123',
    merchant_id: 'merchant-123',
    status: 'EXPECTED',
    version: 1,
    metadata: { source_staging_entry_id: 'staging-123' },
    entries: [
      { entry_id: 'entry-1', account_id: 'account-123', amount: 100.00 },
      { entry_id: 'entry-2', account_id: 'account-456', amount: -100.00 }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('decide', () => {
    it('should create task when staging entry has TRANSACTION mode', async () => {
      // Mock findUnique to return a staging entry with TRANSACTION mode
      (prisma.stagingEntry.findUnique as jest.Mock).mockResolvedValueOnce({
        processing_mode: StagingEntryProcessingMode.TRANSACTION
      });

      // Mock findUniqueOrThrow to return full staging entry with account
      (findUniqueOrThrow as jest.Mock).mockResolvedValueOnce(mockStagingEntry);

      // Call the decide method
      const task = await TransactionTaskClass.decide(mockProcessTrackerTask);

      // Verify task was created
      expect(task).toBeInstanceOf(TransactionTask);
      expect(prisma.stagingEntry.findUnique).toHaveBeenCalledWith({
        where: { staging_entry_id: 'staging-123' },
        select: { processing_mode: true }
      });
      expect(findUniqueOrThrow).toHaveBeenCalledWith(
        'StagingEntry',
        {
          where: { staging_entry_id: 'staging-123' },
          include: { account: true }
        },
        'StagingEntry',
        'staging-123'
      );
    });

    it('should return null when staging entry has different processing mode', async () => {
      // Mock findUnique to return a staging entry with CONFIRMATION mode
      (prisma.stagingEntry.findUnique as jest.Mock).mockResolvedValueOnce({
        processing_mode: StagingEntryProcessingMode.CONFIRMATION
      });

      // Call the decide method
      const task = await TransactionTaskClass.decide(mockProcessTrackerTask);

      // Verify null was returned
      expect(task).toBeNull();
      expect(findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('should return null when staging entry does not exist', async () => {
      // Mock findUnique to return null
      (prisma.stagingEntry.findUnique as jest.Mock).mockResolvedValueOnce(null);

      // Call the decide method
      const task = await TransactionTaskClass.decide(mockProcessTrackerTask);

      // Verify null was returned
      expect(task).toBeNull();
      expect(findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('should return null when payload is missing staging_entry_id', async () => {
      // Create task with invalid payload
      const invalidTask = {
        ...mockProcessTrackerTask,
        payload: {}
      };

      // Call the decide method
      const task = await TransactionTaskClass.decide(invalidTask);

      // Verify null was returned
      expect(task).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        `ProcessTracker ${invalidTask.task_id} missing staging_entry_id in payload`
      );
    });

    it('should return null on error', async () => {
      // Mock findUnique to throw error
      const error = new Error('Database connection error');
      (prisma.stagingEntry.findUnique as jest.Mock).mockRejectedValueOnce(error);

      // Call the decide method
      const task = await TransactionTaskClass.decide(mockProcessTrackerTask);

      // Verify null was returned
      expect(task).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Database connection error',
        { context: 'TransactionTask.decide failed' }
      );
    });
  });

  describe('validate', () => {
    let transactionTask: TransactionTask;

    beforeEach(() => {
      // Create a task instance directly
      transactionTask = new TransactionTask(mockProcessTrackerTask);
      // Set staging entry manually (normally done by decide)
      (transactionTask as any).currentStagingEntry = mockStagingEntry;
    });

    it('should return ok for valid staging entry', async () => {
      // Call validate
      const result = await transactionTask.validate();

      // Verify result
      expect(result.isOk()).toBe(true);
    });

    it('should return error when staging entry is missing', async () => {
      // Clear staging entry
      (transactionTask as any).currentStagingEntry = null;

      // Call validate
      const result = await transactionTask.validate();

      // Verify result
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(ProcessingError);
      expect(result._unsafeUnwrapErr().message).toBe('Task not properly initialized, missing staging entry');
    });

    it('should return error when account_id is missing', async () => {
      // Create invalid staging entry
      const invalidStagingEntry = {
        ...mockStagingEntry,
        account_id: null
      };
      
      // Set invalid staging entry
      (transactionTask as any).currentStagingEntry = invalidStagingEntry;

      // Call validate
      const result = await transactionTask.validate();

      // Verify result
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(ValidationError);
      expect(result._unsafeUnwrapErr().message).toBe('Staging entry missing account_id');
    });

    it('should return error when account is missing', async () => {
      // Create invalid staging entry
      const invalidStagingEntry = {
        ...mockStagingEntry,
        account: null
      };
      
      // Set invalid staging entry
      (transactionTask as any).currentStagingEntry = invalidStagingEntry;

      // Call validate
      const result = await transactionTask.validate();

      // Verify result
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(ValidationError);
      expect(result._unsafeUnwrapErr().message).toBe('Merchant ID not found for staging entry');
    });
  });

  describe('run', () => {
    let transactionTask: TransactionTask;

    beforeEach(() => {
      // Create a task instance directly
      transactionTask = new TransactionTask(mockProcessTrackerTask);
      // Set staging entry manually (normally done by decide)
      (transactionTask as any).currentStagingEntry = mockStagingEntry;
      // Mock processStagingEntryWithRecon
      (processStagingEntryWithRecon as jest.Mock).mockResolvedValue(mockTransactionResult);
    });

    it('should successfully process staging entry', async () => {
      // Call run
      const result = await transactionTask.run();

      // Verify result
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual(mockTransactionResult);

      // Verify processStagingEntryWithRecon was called correctly
      expect(processStagingEntryWithRecon).toHaveBeenCalledWith(
        mockStagingEntry,
        'merchant-123'
      );

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith(
        `Successfully processed staging entry staging-123 into transaction transaction-123`
      );
    });

    it('should handle validation errors', async () => {
      // Create a failing validation scenario
      (transactionTask as any).currentStagingEntry = null;

      // Call run
      const result = await transactionTask.run();

      // Verify result
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(ProcessingError);
      expect(result._unsafeUnwrapErr().message).toBe('Task not properly initialized, missing staging entry');

      // Verify processStagingEntryWithRecon was not called
      expect(processStagingEntryWithRecon).not.toHaveBeenCalled();
    });

    it('should handle errors from processStagingEntryWithRecon', async () => {
      // Mock processStagingEntryWithRecon to throw error
      const processingError = new Error('Processing failed');
      (processStagingEntryWithRecon as jest.Mock).mockRejectedValueOnce(processingError);

      // Call run
      const result = await transactionTask.run();

      // Verify result
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(ProcessingError);
      expect(result._unsafeUnwrapErr().message).toContain('Failed to process transaction for staging entry');
      expect(result._unsafeUnwrapErr().message).toContain('Processing failed');

      // Verify logging
      expect(logger.error).toHaveBeenCalled();
    });
  });
});