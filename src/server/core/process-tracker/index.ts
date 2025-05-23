import prisma from '../../../services/prisma';
import { ProcessTaskType, ProcessTaskStatus, ProcessTracker as PrismaProcessTracker, Prisma } from '@prisma/client';

// Interface for the optional details in updateTaskStatus
interface UpdateTaskDetails {
  error_message?: string;
  increment_attempt?: boolean;
}

/**
 * Creates a new task in the ProcessTracker.
 * @param task_type - The type of the task (from ProcessTaskType enum).
 * @param payload - The JSON payload for the task.
 * @returns The newly created task object.
 */
async function createTask(task_type: ProcessTaskType, payload: Prisma.InputJsonValue): Promise<PrismaProcessTracker> {
  if (!Object.values(ProcessTaskType).includes(task_type)) {
    throw new Error(`Invalid task_type: ${task_type}`);
  }

  const task = await prisma.processTracker.create({
    data: {
      task_type,
      payload,
      status: ProcessTaskStatus.PENDING,
      attempts: 0,
    },
  });
  return task;
}

/**
 * Fetches the next available pending task of a specific type.
 * It prioritizes tasks that are PENDING, then tasks marked for RETRY,
 * ordered by their creation time (oldest first).
 * @param task_type - The type of the task to fetch (from ProcessTaskType enum).
 * @returns The task object or null if no suitable task is found.
 */
async function getNextPendingTask(task_type: ProcessTaskType): Promise<PrismaProcessTracker | null> {
  if (!Object.values(ProcessTaskType).includes(task_type)) {
    throw new Error(`Invalid task_type: ${task_type}`);
  }

  const task = await prisma.processTracker.findFirst({
    where: {
      task_type,
      OR: [
        { status: ProcessTaskStatus.PENDING },
        { status: ProcessTaskStatus.RETRY },
      ],
    },
    orderBy: {
      created_at: 'asc',
    },
  });

  return task;
}

/**
 * Updates the status and other details of a task.
 * @param task_id - The ID of the task to update.
 * @param new_status - The new status for the task (from ProcessTaskStatus enum).
 * @param details - Optional details for the update.
 * @returns The updated task object.
 */
async function updateTaskStatus(task_id: string, new_status: ProcessTaskStatus, details: UpdateTaskDetails = {}): Promise<PrismaProcessTracker> {
  if (!Object.values(ProcessTaskStatus).includes(new_status)) {
    throw new Error(`Invalid new_status: ${new_status}`);
  }

  const dataToUpdate: Prisma.ProcessTrackerUpdateInput = {
    status: new_status,
  };

  if (details.increment_attempt) {
    dataToUpdate.attempts = { increment: 1 };
  }

  if (new_status === ProcessTaskStatus.PROCESSING) {
    dataToUpdate.processing_started_at = new Date();
  } else if (new_status === ProcessTaskStatus.COMPLETED || new_status === ProcessTaskStatus.FAILED) {
    // Set completed_at for terminal states (COMPLETED or FAILED)
    // RETRY is handled separately or not considered a "completion"
    dataToUpdate.completed_at = new Date();
  }

  if (details.error_message) {
    dataToUpdate.last_error = details.error_message;
  } else if (new_status === ProcessTaskStatus.COMPLETED || new_status === ProcessTaskStatus.PROCESSING) {
    dataToUpdate.last_error = null;
  }

  const updatedTask = await prisma.processTracker.update({
    where: { task_id },
    data: dataToUpdate,
  });

  return updatedTask;
}

export {
  createTask,
  getNextPendingTask,
  updateTaskStatus,
};
