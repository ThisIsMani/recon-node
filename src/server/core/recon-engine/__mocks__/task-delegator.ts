import { ProcessTracker } from '@prisma/client';

/**
 * Mock implementation of TaskDelegator.processSingleTask for testing
 */
export const mockProcessSingleTask = jest.fn().mockResolvedValue(true);

/**
 * Mock class for TaskDelegator for testing
 */
export class TaskDelegator {
  constructor(taskManager: any) {
    // Constructor takes a task manager, but we ignore it for the mock
  }
  
  /**
   * Mock implementation of processSingleTask
   * @returns Promise<boolean> resolving to whatever mockProcessSingleTask is configured to return
   */
  async processSingleTask(): Promise<boolean> {
    return mockProcessSingleTask();
  }
}

// Export the class directly as the default export
export default TaskDelegator;
