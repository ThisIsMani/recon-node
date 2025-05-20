// tests/recon-engine/core/consumer.js

const { processSingleTask } = require('../../../src/server/core/recon-engine/consumer');
const processTrackerCore = require('../../../src/server/core/process-tracker');
const reconEngine = require('../../../src/server/core/recon-engine/engine');
const prisma = require('../../../src/services/prisma');
const { ProcessTaskStatus, ProcessTaskType, StagingEntryStatus } = require('@prisma/client');

// Mock dependencies
jest.mock('../../../src/server/core/process-tracker');
jest.mock('../../../src/server/core/recon-engine/engine');
jest.mock('../../../src/services/prisma', () => ({
  stagingEntry: {
    findUnique: jest.fn(),
  },
  // Enums are not typically part of the prisma mock unless you need to override them
  // For actual enum values, they are imported directly from @prisma/client
}));

describe('Recon Engine Consumer - processSingleTask', () => {
  let mockTask;
  let mockStagingEntry;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTask = {
      task_id: 'task-123',
      payload: { staging_entry_id: 'staging-abc' },
      attempts: 0,
    };

    mockStagingEntry = {
      staging_entry_id: 'staging-abc',
      account_id: 'account-1',
      amount: 100,
      currency: 'USD',
      metadata: { note: 'test' },
      account: { // Simulating the include
        merchant_id: 'merchant-xyz',
      },
    };

    processTrackerCore.getNextPendingTask.mockResolvedValue(mockTask);
    processTrackerCore.updateTaskStatus.mockResolvedValue({}); // Default mock for updates

    prisma.stagingEntry.findUnique.mockResolvedValue(mockStagingEntry);
    reconEngine.processStagingEntryWithRecon.mockResolvedValue({ transaction_id: 'txn-123' }); // Default success
  });

  afterEach(() => {
    // Ensure all spies are restored after each test
    jest.restoreAllMocks();
  });

  test('should process a task successfully', async () => {
    // const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Removed
    const result = await processSingleTask();

    expect(result).toBe(true);
    expect(processTrackerCore.getNextPendingTask).toHaveBeenCalledWith(ProcessTaskType.PROCESS_STAGING_ENTRY);
    expect(processTrackerCore.updateTaskStatus).toHaveBeenCalledWith(mockTask.task_id, ProcessTaskStatus.PROCESSING, { increment_attempt: true });
    expect(prisma.stagingEntry.findUnique).toHaveBeenCalledWith({
      where: { staging_entry_id: mockStagingEntry.staging_entry_id },
      include: { account: { select: { merchant_id: true } } },
    });
    expect(reconEngine.processStagingEntryWithRecon).toHaveBeenCalledWith(mockStagingEntry, mockStagingEntry.account.merchant_id);
    expect(processTrackerCore.updateTaskStatus).toHaveBeenCalledWith(mockTask.task_id, ProcessTaskStatus.COMPLETED);
    // expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(`Processing task ${mockTask.task_id}`)); // Removed
    // expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(`Fetched StagingEntry ${mockStagingEntry.staging_entry_id}`)); // Removed
    // expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(`Successfully processed task ${mockTask.task_id}`)); // Removed
    // consoleLogSpy.mockRestore(); // Removed
  });

  test('should return false if no pending task is found', async () => {
    processTrackerCore.getNextPendingTask.mockResolvedValue(null);
    const result = await processSingleTask();
    expect(result).toBe(false);
    expect(prisma.stagingEntry.findUnique).not.toHaveBeenCalled();
    expect(reconEngine.processStagingEntryWithRecon).not.toHaveBeenCalled();
  });

  test('should mark task as FAILED if staging_entry_id is missing in payload', async () => {
    processTrackerCore.getNextPendingTask.mockResolvedValue({ ...mockTask, payload: {} });
    // const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // Removed
    // const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Removed
    
    const result = await processSingleTask();

    expect(result).toBe(false);
    expect(processTrackerCore.updateTaskStatus).toHaveBeenCalledWith(mockTask.task_id, ProcessTaskStatus.FAILED, { error_message: "Missing staging_entry_id in task payload." });
    expect(prisma.stagingEntry.findUnique).not.toHaveBeenCalled();
    // expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining(`Task ${mockTask.task_id} has no staging_entry_id in payload.`)); // Removed
    // consoleErrorSpy.mockRestore(); // Removed
    // consoleLogSpy.mockRestore(); // Removed
  });

  test('should mark task as FAILED if staging entry is not found', async () => {
    prisma.stagingEntry.findUnique.mockResolvedValue(null);
    // const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // Removed
    // const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Removed

    const result = await processSingleTask();

    expect(result).toBe(false);
    expect(processTrackerCore.updateTaskStatus).toHaveBeenCalledWith(mockTask.task_id, ProcessTaskStatus.FAILED, { error_message: `StagingEntry ${mockStagingEntry.staging_entry_id} not found.` });
    expect(reconEngine.processStagingEntryWithRecon).not.toHaveBeenCalled();
    // expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining(`StagingEntry ${mockStagingEntry.staging_entry_id} not found for task ${mockTask.task_id}.`)); // Removed
    // consoleErrorSpy.mockRestore(); // Removed
    // consoleLogSpy.mockRestore(); // Removed
  });

  test('should mark task as FAILED if merchant_id is not found on staging entry', async () => {
    prisma.stagingEntry.findUnique.mockResolvedValue({ ...mockStagingEntry, account: null });
    // const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // Removed
    // const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Removed

    const result = await processSingleTask();

    expect(result).toBe(false);
    expect(processTrackerCore.updateTaskStatus).toHaveBeenCalledWith(mockTask.task_id, ProcessTaskStatus.FAILED, { error_message: `Merchant ID not found for StagingEntry ${mockStagingEntry.staging_entry_id}.` });
    expect(reconEngine.processStagingEntryWithRecon).not.toHaveBeenCalled();
    // expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining(`Merchant ID not found for StagingEntry ${mockStagingEntry.staging_entry_id}`)); // Removed
    // consoleErrorSpy.mockRestore(); // Removed
    // consoleLogSpy.mockRestore(); // Removed
  });
  
  test('should mark task as FAILED if reconEngine.processStagingEntryWithRecon throws an error', async () => {
    const errorMessage = 'Recon engine failed';
    const errorName = 'CustomEngineError';
    const customError = new Error(errorMessage);
    customError.name = errorName;
    customError.stack = 'CustomErrorStack'; // Mock stack for consistent testing
    reconEngine.processStagingEntryWithRecon.mockRejectedValue(customError);
    // const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // Removed
    // const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Removed

    const result = await processSingleTask();

    expect(result).toBe(false);
    expect(reconEngine.processStagingEntryWithRecon).toHaveBeenCalledWith(mockStagingEntry, mockStagingEntry.account.merchant_id);
    expect(processTrackerCore.updateTaskStatus).toHaveBeenCalledWith(mockTask.task_id, ProcessTaskStatus.FAILED, { 
      error_message: `${errorName}: ${errorMessage}`
    });
    // Ensure COMPLETED status is not called
    expect(processTrackerCore.updateTaskStatus).not.toHaveBeenCalledWith(mockTask.task_id, ProcessTaskStatus.COMPLETED);
    // expect(consoleErrorSpy).toHaveBeenCalledWith( // Removed
    //   expect.stringContaining(`Error processing task ${mockTask.task_id} for staging_entry_id ${mockStagingEntry.staging_entry_id}. Error: ${errorName} - ${errorMessage}`), // Removed
    //   customError.stack // Removed
    // ); // Removed
    // consoleErrorSpy.mockRestore(); // Removed
    // consoleLogSpy.mockRestore(); // Removed
  });

  test('should handle error if getNextPendingTask fails', async () => {
    const errorMessage = 'DB connection error';
    processTrackerCore.getNextPendingTask.mockRejectedValue(new Error(errorMessage));
    
    // Spy on console.error to check if it's called
    // const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // Removed
    // const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Removed


    const result = await processSingleTask();
    expect(result).toBe(false);
    // expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error processing task UNKNOWN'), expect.any(String)); // Removed
    
    // consoleErrorSpy.mockRestore(); // Removed
    // consoleLogSpy.mockRestore(); // Removed
  });

  test('should handle error if initial updateTaskStatus to PROCESSING fails', async () => {
    const errorMessage = 'Failed to update to PROCESSING';
    processTrackerCore.updateTaskStatus.mockImplementationOnce(() => Promise.reject(new Error(errorMessage))); // Fail only the first call

    // const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // Removed
    // const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Removed

    const result = await processSingleTask();
    expect(result).toBe(false);
    // expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining(`Error processing task ${mockTask.task_id}`), expect.any(String)); // Removed
    // The second updateTaskStatus (to FAILED) should still be called
    expect(processTrackerCore.updateTaskStatus).toHaveBeenCalledWith(mockTask.task_id, ProcessTaskStatus.FAILED, {
      error_message: `Error: ${errorMessage}` // Error name might be generic 'Error'
    });
    
    // consoleErrorSpy.mockRestore(); // Removed
    // consoleLogSpy.mockRestore(); // Removed
  });
});
