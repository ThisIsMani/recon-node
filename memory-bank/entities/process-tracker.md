# Entity: Process Tracker

**Overview:**
The Process Tracker is a crucial component of the Recon Engine, designed to manage and monitor asynchronous tasks within the system. It acts as a queue and state manager, ensuring that operations like processing staging entries are reliably handled.

**Prisma Schema Definition (`ProcessTracker` model from `prisma/schema.prisma`):**
```prisma
enum ProcessTaskStatus {
  PENDING     // Task is waiting to be picked up
  PROCESSING  // Task is currently being processed
  COMPLETED   // Task finished successfully
  FAILED      // Task failed and will not be retried (or max retries reached)
  RETRY       // Task failed but can be retried
}

enum ProcessTaskType {
  PROCESS_STAGING_ENTRY // For tasks related to processing a StagingEntry
  // Other task types can be added as needed
}

model ProcessTracker {
  task_id               String            @id @default(cuid())
  task_type             ProcessTaskType
  payload               Json              // Example: { "staging_entry_id": "some_cuid" }
  status                ProcessTaskStatus @default(PENDING)
  attempts              Int               @default(0)
  last_error            String?
  created_at            DateTime          @default(now())
  updated_at            DateTime          @updatedAt
  processing_started_at DateTime?         // Timestamp when processing for the current attempt began
  completed_at          DateTime?         // Timestamp when task reached a final state (COMPLETED or non-retryable FAILED)

  @@index([status])
  @@index([task_type])
  @@index([created_at]) // Useful for fetching oldest pending tasks
}
```

**Fields Explained:**
- `task_id`: Unique identifier for the task.
- `task_type`: Categorizes the task (e.g., `PROCESS_STAGING_ENTRY`).
- `payload`: JSON object containing necessary data for the task processor (e.g., the ID of the `StagingEntry` to process).
- `status`: Current state of the task (e.g., `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `RETRY`).
- `attempts`: Number of times processing has been attempted for this task.
- `last_error`: Stores the error message from the most recent failed attempt.
- `created_at`: Timestamp of when the task was created.
- `updated_at`: Timestamp of the last update to the task record.
- `processing_started_at`: Timestamp indicating when the current processing attempt began. Helps in identifying long-running or stuck tasks.
- `completed_at`: Timestamp indicating when the task was finalized (either successfully completed or failed definitively).

**Core Logic (`src/server/core/process-tracker/index.ts`):**
- `createTask(task_type, payload)`: Creates a new task, typically with `PENDING` status.
- `getNextPendingTask(task_type)`: Fetches the next available task (oldest `PENDING` or `RETRY`) for a given `task_type`.
- `updateTaskStatus(task_id, new_status, details = {})`: Updates a task's status, attempts, error messages, and relevant timestamps (`processing_started_at`, `completed_at`).

**Role in Recon Engine:**
- **Producer:** When a `StagingEntry` is created, the producer logic (within `createStagingEntry`) will call `createTask` to add a `PROCESS_STAGING_ENTRY` task to the Process Tracker.
- **Consumer:** The Recon Engine's consumer component will periodically call `getNextPendingTask` to pick up tasks. It will then process the task (e.g., transform the `StagingEntry` into `Entry` and `Transaction` records) and use `updateTaskStatus` to reflect the outcome (e.g., `COMPLETED`, `FAILED`, or `RETRY`).

**Task-Based Architecture:**
- The Recon Engine now uses a task-based architecture where each process task is handled by a specialized task implementation.
- `TaskManager` is responsible for finding the appropriate task implementation for a given process task.
- Task implementations include:
  - `TransactionCreationTask`: Handles staging entries in `TRANSACTION` mode
  - `ExpectedEntryMatchingTask`: Handles staging entries in `CONFIRMATION` mode
- Each task implements the `ReconTask` interface with three key methods:
  - `decide`: Determines if the task can handle a given process tracker task
  - `validate`: Validates the data required for processing
  - `run`: Executes the business logic and returns a result

**Test Coverage:**
- The process-tracker module now has 100% test coverage, thoroughly testing all functions and edge cases
- Tests include:
  - Creating tasks with valid and invalid inputs
  - Retrieving next pending tasks with various conditions
  - Updating task status with different statuses and options
  - Error handling for invalid inputs

This system allows for decoupling the initial creation of data (like `StagingEntry`) from its subsequent complex processing, improving responsiveness and resilience.