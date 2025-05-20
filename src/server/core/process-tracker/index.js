// src/server/core/process-tracker/index.js
const prisma = require('../../../services/prisma');
// Prisma Client automatically makes enums available, e.g. prisma.ProcessTaskStatus
// No separate import needed like: const { ProcessTaskStatus, ProcessTaskType } = require('@prisma/client');

/**
 * Creates a new task in the ProcessTracker.
 * @param {string} task_type - The type of the task (from ProcessTaskType enum).
 * @param {object} payload - The JSON payload for the task.
 * @returns {Promise<object>} The newly created task object.
 */
async function createTask(task_type, payload) {
  if (!prisma.ProcessTaskType[task_type]) {
    throw new Error(`Invalid task_type: ${task_type}`);
  }

  const task = await prisma.processTracker.create({
    data: {
      task_type,
      payload,
      status: prisma.ProcessTaskStatus.PENDING,
      attempts: 0,
    },
  });
  return task;
}

/**
 * Fetches the next available pending task of a specific type.
 * It prioritizes tasks that are PENDING, then tasks marked for RETRY,
 * ordered by their creation time (oldest first).
 * @param {string} task_type - The type of the task to fetch (from ProcessTaskType enum).
 * @returns {Promise<object|null>} The task object or null if no suitable task is found.
 */
async function getNextPendingTask(task_type) {
  if (!prisma.ProcessTaskType[task_type]) {
    throw new Error(`Invalid task_type: ${task_type}`);
  }

  const task = await prisma.processTracker.findFirst({
    where: {
      task_type,
      OR: [
        { status: prisma.ProcessTaskStatus.PENDING },
        { status: prisma.ProcessTaskStatus.RETRY },
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
 * @param {string} task_id - The ID of the task to update.
 * @param {string} new_status - The new status for the task (from ProcessTaskStatus enum).
 * @param {object} [details={}] - Optional details for the update.
 * @param {string} [details.error_message] - Error message if the task failed.
 * @param {boolean} [details.increment_attempt=false] - Whether to increment the attempt count.
 * @returns {Promise<object>} The updated task object.
 */
async function updateTaskStatus(task_id, new_status, details = {}) {
  if (!prisma.ProcessTaskStatus[new_status]) {
    throw new Error(`Invalid new_status: ${new_status}`);
  }

  const dataToUpdate = {
    status: new_status,
  };

  if (details.increment_attempt) {
    dataToUpdate.attempts = { increment: 1 };
  }

  if (new_status === prisma.ProcessTaskStatus.PROCESSING) {
    dataToUpdate.processing_started_at = new Date();
  } else if (new_status === prisma.ProcessTaskStatus.COMPLETED || (new_status === prisma.ProcessTaskStatus.FAILED && new_status !== prisma.ProcessTaskStatus.RETRY)) {
    dataToUpdate.completed_at = new Date();
  }

  if (details.error_message) {
    dataToUpdate.last_error = details.error_message;
  } else if (new_status === prisma.ProcessTaskStatus.COMPLETED || new_status === prisma.ProcessTaskStatus.PROCESSING) {
    // Clear last_error if moving to a non-failed state or processing
    dataToUpdate.last_error = null;
  }


  const updatedTask = await prisma.processTracker.update({
    where: { task_id },
    data: dataToUpdate,
  });

  return updatedTask;
}

module.exports = {
  createTask,
  getNextPendingTask,
  updateTaskStatus,
};
