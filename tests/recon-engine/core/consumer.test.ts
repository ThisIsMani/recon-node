import { processSingleTask } from '../../../src/server/core/recon-engine/consumer';
import * as processTrackerCoreModule from '../../../src/server/core/process-tracker';
import * as reconEngineModule from '../../../src/server/core/recon-engine/engine';
import prismaClient from '../../../src/services/prisma'; // Renamed to avoid conflict with prisma module
import { ProcessTaskStatus, ProcessTaskType, StagingEntryStatus, StagingEntry, ProcessTracker, Account as PrismaAccount, Prisma } from '@prisma/client';
import loggerClient from '../../../src/services/logger'; // Renamed to avoid conflict

// Mock dependencies
// Mocking named exports requires a specific structure
jest.mock('../../../src/server/core/process-tracker', () => ({
  __esModule: true, // This is important for ES modules
  ...jest.requireActual('../../../src/server/core/process-tracker'), // Import and retain default exports or other non-mocked parts
  getNextPendingTask: jest.fn(),
  updateTaskStatus: jest.fn(),
}));
jest.mock('../../../src/server/core/recon-engine/engine', () => ({
  __esModule: true,
  ...jest.requireActual('../../../src/server/core/recon-engine/engine'),
  processStagingEntryWithRecon: jest.fn(),
}));
// This will now use the manual mock from src/services/__mocks__/prisma.ts
jest.mock('../../../src/services/prisma'); 

jest.mock('../../../src/services/logger', () => ({
  __esModule: true,
  default: { // Assuming logger is default export
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }
}));

// Typed mocks
const mockProcessTrackerCore = processTrackerCoreModule as jest.Mocked<typeof processTrackerCoreModule>;
const mockReconEngine = reconEngineModule as jest.Mocked<typeof reconEngineModule>;
// prismaClient is the default export from the mocked module.
// The mock structure for default is { stagingEntry: { findUnique: jest.fn() } }
// So, prismaClient itself is that object.
const mockPrismaStagingEntry = (prismaClient as any).stagingEntry as jest.Mocked<typeof prismaClient.stagingEntry>;
const mockLogger = loggerClient as jest.Mocked<typeof loggerClient>;


describe('Recon Engine Consumer - processSingleTask', () => {
  let mockTask: ProcessTracker;
  let mockStagingEntry: StagingEntry & { account: { merchant_id: string } | null };

  beforeEach(() => {
    jest.clearAllMocks();

    mockTask = {
      task_id: 'task-123',
      task_type: ProcessTaskType.PROCESS_STAGING_ENTRY,
      payload: { staging_entry_id: 'staging-abc' } as Prisma.JsonObject,
      status: ProcessTaskStatus.PENDING,
      attempts: 0,
      created_at: new Date(),
      updated_at: new Date(),
      processing_started_at: null,
      completed_at: null,
      last_error: null,
    };

    mockStagingEntry = {
      staging_entry_id: 'staging-abc',
      account_id: 'account-1',
      entry_type: 'DEBIT', // Valid EntryType
      amount: new Prisma.Decimal(100),
      currency: 'USD',
      status: StagingEntryStatus.PENDING,
      processing_mode: 'CONFIRMATION',
      effective_date: new Date(),
      metadata: { note: 'test' } as Prisma.JsonObject,
      created_at: new Date(),
      updated_at: new Date(),
      discarded_at: null,
      // transaction_id: null, // Removed as it's optional and nullable
      account: { 
        merchant_id: 'merchant-xyz',
      },
    };

    mockProcessTrackerCore.getNextPendingTask.mockResolvedValue(mockTask);
    mockProcessTrackerCore.updateTaskStatus.mockResolvedValue({} as ProcessTracker); 

    mockPrismaStagingEntry.findUnique.mockResolvedValue(mockStagingEntry);
    mockReconEngine.processStagingEntryWithRecon.mockResolvedValue({ transaction_id: 'txn-123' } as any); 
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should process a task successfully', async () => {
    const result = await processSingleTask();

    expect(result).toBe(true);
    expect(mockProcessTrackerCore.getNextPendingTask).toHaveBeenCalledWith(ProcessTaskType.PROCESS_STAGING_ENTRY);
    expect(mockProcessTrackerCore.updateTaskStatus).toHaveBeenCalledWith(mockTask.task_id, ProcessTaskStatus.PROCESSING, { increment_attempt: true });
    expect(mockPrismaStagingEntry.findUnique).toHaveBeenCalledWith({
      where: { staging_entry_id: mockStagingEntry.staging_entry_id },
      include: { account: { select: { merchant_id: true } } },
    });
    expect(mockReconEngine.processStagingEntryWithRecon).toHaveBeenCalledWith(mockStagingEntry, mockStagingEntry.account!.merchant_id);
    expect(mockProcessTrackerCore.updateTaskStatus).toHaveBeenCalledWith(mockTask.task_id, ProcessTaskStatus.COMPLETED);
    expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining(`Processing task ${mockTask.task_id}`));
    expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining(`Fetched StagingEntry ${mockStagingEntry.staging_entry_id}`));
    expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining(`Successfully processed task ${mockTask.task_id}`));
  });

  test('should return false if no pending task is found', async () => {
    mockProcessTrackerCore.getNextPendingTask.mockResolvedValue(null);
    const result = await processSingleTask();
    expect(result).toBe(false);
    expect(mockPrismaStagingEntry.findUnique).not.toHaveBeenCalled();
    expect(mockReconEngine.processStagingEntryWithRecon).not.toHaveBeenCalled();
  });

  test('should mark task as FAILED if staging_entry_id is missing in payload', async () => {
    mockProcessTrackerCore.getNextPendingTask.mockResolvedValue({ ...mockTask, payload: {} as Prisma.JsonObject });
    
    const result = await processSingleTask();

    expect(result).toBe(true); // Task was processed (failed)
    expect(mockProcessTrackerCore.updateTaskStatus).toHaveBeenCalledWith(mockTask.task_id, ProcessTaskStatus.FAILED, { error_message: "Invalid or missing payload structure for staging_entry_id." });
    expect(mockPrismaStagingEntry.findUnique).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(`Task ${mockTask.task_id} has invalid or missing payload structure`));
  });

  test('should mark task as FAILED if staging entry is not found', async () => {
    mockPrismaStagingEntry.findUnique.mockResolvedValue(null);

    const result = await processSingleTask();

    expect(result).toBe(true); // Task was processed (failed)
    expect(mockProcessTrackerCore.updateTaskStatus).toHaveBeenCalledWith(mockTask.task_id, ProcessTaskStatus.FAILED, { error_message: `StagingEntry ${mockStagingEntry.staging_entry_id} not found.` });
    expect(mockReconEngine.processStagingEntryWithRecon).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(`StagingEntry ${mockStagingEntry.staging_entry_id} not found for task ${mockTask.task_id}.`));
  });

  test('should mark task as FAILED if merchant_id is not found on staging entry', async () => {
    mockPrismaStagingEntry.findUnique.mockResolvedValue({ ...mockStagingEntry, account: null } as any); // Cast to any to bypass complex type issue

    const result = await processSingleTask();

    expect(result).toBe(true); // Task was processed (failed)
    expect(mockProcessTrackerCore.updateTaskStatus).toHaveBeenCalledWith(mockTask.task_id, ProcessTaskStatus.FAILED, { error_message: `Merchant ID not found for StagingEntry ${mockStagingEntry.staging_entry_id}.` });
    expect(mockReconEngine.processStagingEntryWithRecon).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(`Merchant ID not found for StagingEntry ${mockStagingEntry.staging_entry_id}`));
  });
  
  test('should mark task as FAILED if reconEngine.processStagingEntryWithRecon throws an error', async () => {
    const errorMessage = 'Recon engine failed';
    const errorName = 'CustomEngineError';
    const customError = new Error(errorMessage);
    customError.name = errorName;
    customError.stack = 'CustomErrorStack';
    mockReconEngine.processStagingEntryWithRecon.mockRejectedValue(customError);

    const result = await processSingleTask();

    expect(result).toBe(true); // Task was processed (failed)
    expect(mockReconEngine.processStagingEntryWithRecon).toHaveBeenCalledWith(mockStagingEntry, mockStagingEntry.account!.merchant_id);
    expect(mockProcessTrackerCore.updateTaskStatus).toHaveBeenCalledWith(mockTask.task_id, ProcessTaskStatus.FAILED, { 
      error_message: `${errorName}: ${errorMessage}`
    });
    expect(mockProcessTrackerCore.updateTaskStatus).not.toHaveBeenCalledWith(mockTask.task_id, ProcessTaskStatus.COMPLETED);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining(`Error processing task ${mockTask.task_id} for staging_entry_id ${mockStagingEntry.staging_entry_id}. Error: ${errorName} - ${errorMessage}`),
      customError.stack
    );
  });

  test('should handle error if getNextPendingTask fails', async () => {
    const errorMessage = 'DB connection error';
    mockProcessTrackerCore.getNextPendingTask.mockRejectedValue(new Error(errorMessage));
    
    const result = await processSingleTask();
    expect(result).toBe(true); // Task processing attempted and failed
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error processing task UNKNOWN_TASK'), expect.any(String));
  });

  test('should handle error if initial updateTaskStatus to PROCESSING fails', async () => {
    const errorMessage = 'Failed to update to PROCESSING';
    (mockProcessTrackerCore.updateTaskStatus as jest.Mock).mockImplementationOnce(async () => { throw new Error(errorMessage); });


    const result = await processSingleTask();
    expect(result).toBe(true); // Task processing attempted and failed
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining(`Error processing task ${mockTask.task_id}`), expect.any(String));
    expect(mockProcessTrackerCore.updateTaskStatus).toHaveBeenCalledWith(mockTask.task_id, ProcessTaskStatus.FAILED, {
      error_message: `Error: ${errorMessage}`
    });
  });
});
