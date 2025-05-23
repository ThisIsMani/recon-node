// Mock dependencies first, before any imports
jest.mock('../../../src/server/core/process-tracker');
jest.mock('../../../src/services/prisma');
jest.mock('../../../src/services/logger');
jest.mock('../../../src/server/core/recon-engine/task-delegator');

// We need to manually mock the task-delegator since jest.mock() might not be setting it up correctly
import TaskDelegatorMock, { mockProcessSingleTask } from '../../../src/server/core/recon-engine/__mocks__/task-delegator';

// Manually inject the mock into the consumer
import * as taskDelegatorModule from '../../../src/server/core/recon-engine/task-delegator';
(taskDelegatorModule as any).TaskDelegator = TaskDelegatorMock;

// Now import after all mocks are set up
import { processSingleTask, startConsumer, resetConsumer, stopConsumer } from '../../../src/server/core/recon-engine/consumer';
import * as processTrackerCoreModule from '../../../src/server/core/process-tracker';
import loggerClient from '../../../src/services/logger';

// Create typed mocks for use in tests
const mockProcessTrackerCore = processTrackerCoreModule as jest.Mocked<typeof processTrackerCoreModule>;
const mockLogger = loggerClient as jest.Mocked<typeof loggerClient>;

describe('Recon Engine Consumer - processSingleTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetConsumer(); // Reset the consumer state between tests
  });

  afterEach(() => {
    stopConsumer(); // Ensure consumer is stopped
  });

  test('should delegate to TaskDelegator.processSingleTask', async () => {
    // Set up the mock to return true
    mockProcessSingleTask.mockResolvedValueOnce(true);
    
    const result = await processSingleTask();

    expect(result).toBe(true);
    expect(mockProcessSingleTask).toHaveBeenCalledTimes(1);
  });

  test('should return false when TaskDelegator.processSingleTask returns false', async () => {
    // Set up the mock to return false for this test
    mockProcessSingleTask.mockResolvedValueOnce(false);
    
    const result = await processSingleTask();
    
    expect(result).toBe(false);
    expect(mockProcessSingleTask).toHaveBeenCalledTimes(1);
  });
});

// Define a simpler set of tests for the startConsumer function
describe('Recon Engine Consumer - startConsumer', () => {
  // We'll use simple function mocks for these tests
  beforeEach(() => {
    jest.clearAllMocks();
    resetConsumer(); // Reset the consumer state between tests
    
    // Override process.env for tests
    delete process.env.RECON_ENGINE_POLL_INTERVAL_MS;
    
    // Override processSingleTask for tests
    mockProcessSingleTask.mockImplementation(() => Promise.resolve(true));
  });
  
  afterEach(() => {
    stopConsumer(); // Ensure consumer is stopped
    delete process.env.RECON_ENGINE_POLL_INTERVAL_MS;
  });
  
  test('should log startup message with correct polling interval', async () => {
    const defaultInterval = 2000;
    
    // Start consumer but immediately stop it to prevent long-running process
    // We're only testing the startup logging here
    startConsumer(defaultInterval);
    stopConsumer();
    
    // Verify the startup log message
    expect(mockLogger.info).toHaveBeenCalledWith(
      `Recon Engine Consumer: Starting... Polling every ${defaultInterval / 1000} seconds.`
    );
  });
  
  test('should use default polling interval if env variable is invalid', async () => {
    process.env.RECON_ENGINE_POLL_INTERVAL_MS = 'not-a-number';
    const defaultInterval = 3000;
    
    // Start consumer but immediately stop it
    startConsumer(defaultInterval);
    stopConsumer();
    
    // Verify warning and startup logs
    expect(mockLogger.warn).toHaveBeenCalledWith(
      `Invalid RECON_ENGINE_POLL_INTERVAL_MS: not-a-number. Using default ${defaultInterval}ms.`
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      `Recon Engine Consumer: Starting... Polling every ${defaultInterval / 1000} seconds.`
    );
  });
  
  test('should log warning if already running', async () => {
    // Start once
    startConsumer();
    
    // Clear logs to check for the warning
    mockLogger.warn.mockClear();
    
    // Try to start again
    startConsumer();
    
    // Verify warning
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Recon Engine Consumer: Already running, ignoring duplicate start request'
    );
    
    // Clean up
    stopConsumer();
  });
  
  test('should log when stopping consumer', async () => {
    // Start and then stop
    startConsumer();
    stopConsumer();
    
    // Verify logging
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Recon Engine Consumer: Stopping...'
    );
  });
});
