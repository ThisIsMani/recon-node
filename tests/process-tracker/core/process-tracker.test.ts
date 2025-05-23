// Mock prisma first
jest.mock('../../../src/services/prisma');

import { createTask, getNextPendingTask, updateTaskStatus } from '../../../src/server/core/process-tracker';
import prisma from '../../../src/services/prisma'; // This will now be the mock
import { ProcessTaskStatus, ProcessTaskType } from '@prisma/client';
import { ProcessTracker } from '../../../src/server/domain_models/process_tracker.types';

describe('Process Tracker Core Logic', () => {
  const mockDate = new Date();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      // Mock response data
      const mockTask = {
        task_id: 'task-123',
        task_type: ProcessTaskType.PROCESS_STAGING_ENTRY,
        payload: { staging_entry_id: 'staging-entry-123' },
        status: ProcessTaskStatus.PENDING,
        attempts: 0,
        created_at: mockDate,
        updated_at: mockDate,
        processing_started_at: null,
        completed_at: null,
        last_error: null
      };

      // Set up mock
      (prisma.processTracker.create as jest.Mock).mockResolvedValueOnce(mockTask);

      // Call the function
      const result = await createTask(ProcessTaskType.PROCESS_STAGING_ENTRY, { staging_entry_id: 'staging-entry-123' });

      // Verify result
      expect(result).toEqual(mockTask);
      expect(prisma.processTracker.create).toHaveBeenCalledWith({
        data: {
          task_type: ProcessTaskType.PROCESS_STAGING_ENTRY,
          payload: { staging_entry_id: 'staging-entry-123' },
          status: ProcessTaskStatus.PENDING,
          attempts: 0
        }
      });
    });

    it('should throw error for invalid task type', async () => {
      // Call with invalid task type
      await expect(createTask('INVALID_TYPE' as ProcessTaskType, {}))
        .rejects.toThrow('Invalid task_type: INVALID_TYPE');
      
      // Verify no database call was made
      expect(prisma.processTracker.create).not.toHaveBeenCalled();
    });
  });

  describe('getNextPendingTask', () => {
    it('should return the next pending task', async () => {
      // Mock response data
      const mockTask = {
        task_id: 'task-123',
        task_type: ProcessTaskType.PROCESS_STAGING_ENTRY,
        payload: { staging_entry_id: 'staging-entry-123' },
        status: ProcessTaskStatus.PENDING,
        attempts: 0,
        created_at: mockDate,
        updated_at: mockDate,
        processing_started_at: null,
        completed_at: null,
        last_error: null
      };

      // Set up mock
      (prisma.processTracker.findFirst as jest.Mock).mockResolvedValueOnce(mockTask);

      // Call the function
      const result = await getNextPendingTask(ProcessTaskType.PROCESS_STAGING_ENTRY);

      // Verify result
      expect(result).toEqual(mockTask);
      expect(prisma.processTracker.findFirst).toHaveBeenCalledWith({
        where: {
          task_type: ProcessTaskType.PROCESS_STAGING_ENTRY,
          OR: [
            { status: ProcessTaskStatus.PENDING },
            { status: ProcessTaskStatus.RETRY }
          ]
        },
        orderBy: {
          created_at: 'asc'
        }
      });
    });

    it('should return null when no pending tasks exist', async () => {
      // Set up mock to return null
      (prisma.processTracker.findFirst as jest.Mock).mockResolvedValueOnce(null);

      // Call the function
      const result = await getNextPendingTask(ProcessTaskType.PROCESS_STAGING_ENTRY);

      // Verify result
      expect(result).toBeNull();
    });

    it('should throw error for invalid task type', async () => {
      // Call with invalid task type
      await expect(getNextPendingTask('INVALID_TYPE' as ProcessTaskType))
        .rejects.toThrow('Invalid task_type: INVALID_TYPE');
      
      // Verify no database call was made
      expect(prisma.processTracker.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status to PROCESSING', async () => {
      // Mock the current date for testing
      const now = new Date();
      jest.spyOn(global, 'Date').mockImplementationOnce(() => now);

      // Mock response data
      const mockUpdatedTask = {
        task_id: 'task-123',
        task_type: ProcessTaskType.PROCESS_STAGING_ENTRY,
        payload: { staging_entry_id: 'staging-entry-123' },
        status: ProcessTaskStatus.PROCESSING,
        attempts: 0,
        created_at: mockDate,
        updated_at: mockDate,
        processing_started_at: now,
        completed_at: null,
        last_error: null
      };

      // Set up mock
      (prisma.processTracker.update as jest.Mock).mockResolvedValueOnce(mockUpdatedTask);

      // Call the function
      const result = await updateTaskStatus('task-123', ProcessTaskStatus.PROCESSING);

      // Verify result
      expect(result).toEqual(mockUpdatedTask);
      expect(prisma.processTracker.update).toHaveBeenCalledWith({
        where: { task_id: 'task-123' },
        data: {
          status: ProcessTaskStatus.PROCESSING,
          processing_started_at: now,
          last_error: null
        }
      });
    });

    it('should update task status to COMPLETED with completion time', async () => {
      // Mock the current date for testing
      const now = new Date();
      jest.spyOn(global, 'Date').mockImplementationOnce(() => now);

      // Mock response data
      const mockUpdatedTask = {
        task_id: 'task-123',
        task_type: ProcessTaskType.PROCESS_STAGING_ENTRY,
        payload: { staging_entry_id: 'staging-entry-123' },
        status: ProcessTaskStatus.COMPLETED,
        attempts: 0,
        created_at: mockDate,
        updated_at: mockDate,
        processing_started_at: mockDate,
        completed_at: now,
        last_error: null
      };

      // Set up mock
      (prisma.processTracker.update as jest.Mock).mockResolvedValueOnce(mockUpdatedTask);

      // Call the function
      const result = await updateTaskStatus('task-123', ProcessTaskStatus.COMPLETED);

      // Verify result
      expect(result).toEqual(mockUpdatedTask);
      expect(prisma.processTracker.update).toHaveBeenCalledWith({
        where: { task_id: 'task-123' },
        data: {
          status: ProcessTaskStatus.COMPLETED,
          completed_at: now,
          last_error: null
        }
      });
    });

    it('should update task status to FAILED with error message and increment attempts', async () => {
      // Mock the current date for testing
      const now = new Date();
      jest.spyOn(global, 'Date').mockImplementationOnce(() => now);

      // Mock response data
      const mockUpdatedTask = {
        task_id: 'task-123',
        task_type: ProcessTaskType.PROCESS_STAGING_ENTRY,
        payload: { staging_entry_id: 'staging-entry-123' },
        status: ProcessTaskStatus.FAILED,
        attempts: 1,
        created_at: mockDate,
        updated_at: mockDate,
        processing_started_at: mockDate,
        completed_at: now,
        last_error: 'Test error message'
      };

      // Set up mock
      (prisma.processTracker.update as jest.Mock).mockResolvedValueOnce(mockUpdatedTask);

      // Call the function
      const result = await updateTaskStatus('task-123', ProcessTaskStatus.FAILED, {
        error_message: 'Test error message',
        increment_attempt: true
      });

      // Verify result
      expect(result).toEqual(mockUpdatedTask);
      expect(prisma.processTracker.update).toHaveBeenCalledWith({
        where: { task_id: 'task-123' },
        data: {
          status: ProcessTaskStatus.FAILED,
          completed_at: now,
          last_error: 'Test error message',
          attempts: { increment: 1 }
        }
      });
    });

    it('should update task status to RETRY with error message', async () => {
      // Mock response data
      const mockUpdatedTask = {
        task_id: 'task-123',
        task_type: ProcessTaskType.PROCESS_STAGING_ENTRY,
        payload: { staging_entry_id: 'staging-entry-123' },
        status: ProcessTaskStatus.RETRY,
        attempts: 1,
        created_at: mockDate,
        updated_at: mockDate,
        processing_started_at: mockDate,
        completed_at: null,
        last_error: 'Temporary error, will retry'
      };

      // Set up mock
      (prisma.processTracker.update as jest.Mock).mockResolvedValueOnce(mockUpdatedTask);

      // Call the function
      const result = await updateTaskStatus('task-123', ProcessTaskStatus.RETRY, {
        error_message: 'Temporary error, will retry',
        increment_attempt: true
      });

      // Verify result
      expect(result).toEqual(mockUpdatedTask);
      expect(prisma.processTracker.update).toHaveBeenCalledWith({
        where: { task_id: 'task-123' },
        data: {
          status: ProcessTaskStatus.RETRY,
          attempts: { increment: 1 },
          last_error: 'Temporary error, will retry'
        }
      });
    });

    it('should throw error for invalid status', async () => {
      // Call with invalid status
      await expect(updateTaskStatus('task-123', 'INVALID_STATUS' as ProcessTaskStatus))
        .rejects.toThrow('Invalid new_status: INVALID_STATUS');
      
      // Verify no database call was made
      expect(prisma.processTracker.update).not.toHaveBeenCalled();
    });
  });
});