import { TaskManager } from '../../../src/server/core/recon-engine/task';
import { ProcessTracker, ProcessTaskType, Prisma } from '@prisma/client';
import { ReconTask, ReconTaskClass } from '../../../src/server/core/recon-engine/task/task-interface';
import logger from '../../../src/services/logger';

// Mock logger
jest.mock('../../../src/services/logger');

describe('TaskManager', () => {
  // Mock task implementation for testing
  let mockTask1Instance: ReconTask;
  let mockTask2Instance: ReconTask;
  let mockTaskClass1: ReconTaskClass;
  let mockTaskClass2: ReconTaskClass;
  let taskManager: TaskManager;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock task instances
    mockTask1Instance = {
      validate: jest.fn().mockResolvedValue({ isErr: () => false }),
      run: jest.fn().mockResolvedValue({ isErr: () => false })
    } as unknown as ReconTask;
    
    mockTask2Instance = {
      validate: jest.fn().mockResolvedValue({ isErr: () => false }),
      run: jest.fn().mockResolvedValue({ isErr: () => false })
    } as unknown as ReconTask;
    
    // Create mock task classes with decide methods as jest functions
    mockTaskClass1 = {
      decide: jest.fn()
    };
    
    mockTaskClass2 = {
      decide: jest.fn()
    };
    
    // Initialize task manager with the mock task classes
    taskManager = new TaskManager([mockTaskClass1, mockTaskClass2]);
  });

  describe('findTaskForProcessTracker', () => {
    const baseProcessTrackerTask: ProcessTracker = {
      task_id: 'test-task-id',
      task_type: ProcessTaskType.PROCESS_STAGING_ENTRY,
      payload: { staging_entry_id: 'test-staging-id' } as Prisma.JsonObject,
      status: 'PENDING',
      attempts: 0,
      last_error: null,
      created_at: new Date(),
      updated_at: new Date(),
      processing_started_at: null,
      completed_at: null,
    };

    it('should return the first task instance whose class decide method returns a task', async () => {
      // Setup mock behavior for decide methods
      (mockTaskClass1.decide as jest.Mock).mockResolvedValue(mockTask1Instance);
      (mockTaskClass2.decide as jest.Mock).mockResolvedValue(null);
      
      const task = await taskManager.findTaskForProcessTracker(baseProcessTrackerTask);
      expect(task).toBe(mockTask1Instance);
      expect(mockTaskClass1.decide).toHaveBeenCalledWith(baseProcessTrackerTask);
      expect(mockTaskClass2.decide).not.toHaveBeenCalled();
    });

    it('should return the second task if the first class returns null and second returns a task', async () => {
      // Setup mock behavior for decide methods
      (mockTaskClass1.decide as jest.Mock).mockResolvedValue(null);
      (mockTaskClass2.decide as jest.Mock).mockResolvedValue(mockTask2Instance);

      const task = await taskManager.findTaskForProcessTracker(baseProcessTrackerTask);
      expect(task).toBe(mockTask2Instance);
      expect(mockTaskClass1.decide).toHaveBeenCalledWith(baseProcessTrackerTask);
      expect(mockTaskClass2.decide).toHaveBeenCalledWith(baseProcessTrackerTask);
    });

    it('should return null if no task class decides to handle it', async () => {
      // Setup mock behavior for decide methods
      (mockTaskClass1.decide as jest.Mock).mockResolvedValue(null);
      (mockTaskClass2.decide as jest.Mock).mockResolvedValue(null);

      const task = await taskManager.findTaskForProcessTracker(baseProcessTrackerTask);
      expect(task).toBeNull();
      expect(mockTaskClass1.decide).toHaveBeenCalledWith(baseProcessTrackerTask);
      expect(mockTaskClass2.decide).toHaveBeenCalledWith(baseProcessTrackerTask);
    });

    it('should handle and log exceptions in task class decide methods', async () => {
      const error = new Error('Task decision error');
      // Setup mock behavior for decide methods
      (mockTaskClass1.decide as jest.Mock).mockRejectedValue(error);
      (mockTaskClass2.decide as jest.Mock).mockResolvedValue(mockTask2Instance);

      const task = await taskManager.findTaskForProcessTracker(baseProcessTrackerTask);
      expect(task).toBe(mockTask2Instance);
      expect(mockTaskClass1.decide).toHaveBeenCalledWith(baseProcessTrackerTask);
      expect(mockTaskClass2.decide).toHaveBeenCalledWith(baseProcessTrackerTask);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Error in task class decision logic'));
    });
  });

  describe('registerTaskClass', () => {
    it('should add a new task class to the registry', async () => {
      // Create a new mock task class
      const newMockTaskClass: ReconTaskClass = {
        decide: jest.fn()
      };
      
      // Setup the mock behavior
      (newMockTaskClass.decide as jest.Mock).mockResolvedValue(mockTask1Instance);
      (mockTaskClass1.decide as jest.Mock).mockResolvedValue(null);
      (mockTaskClass2.decide as jest.Mock).mockResolvedValue(null);
      
      // Register the new task class
      taskManager.registerTaskClass(newMockTaskClass);
      
      // Test with a process tracker task
      const testTask: ProcessTracker = {
        task_id: 'test-task-id',
        task_type: ProcessTaskType.PROCESS_STAGING_ENTRY,
        payload: { staging_entry_id: 'test-staging-id' } as Prisma.JsonObject,
        status: 'PENDING',
        attempts: 0,
        last_error: null,
        created_at: new Date(),
        updated_at: new Date(),
        processing_started_at: null,
        completed_at: null,
      };
      
      // Call findTaskForProcessTracker
      const task = await taskManager.findTaskForProcessTracker(testTask);
      
      // Verify the new task class was used
      expect(task).toBe(mockTask1Instance);
      expect(newMockTaskClass.decide).toHaveBeenCalledWith(testTask);
      expect(mockTaskClass1.decide).toHaveBeenCalledWith(testTask);
      expect(mockTaskClass2.decide).toHaveBeenCalledWith(testTask);
    });
  });
});
