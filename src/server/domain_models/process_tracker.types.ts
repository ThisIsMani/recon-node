// Domain Model for ProcessTracker Entity

import { 
    ProcessTracker as PrismaProcessTracker, 
    ProcessTaskType, 
    ProcessTaskStatus 
} from '@prisma/client';

// The core ProcessTracker domain model.
export interface ProcessTracker extends PrismaProcessTracker {
  // Domain-specific properties or methods can be added here.
  // For example:
  // isRetryable(): boolean;
  // getTaskDuration(): number | null; // in milliseconds
}

// Re-export enums if used directly in domain logic,
// or define domain-specific enums if they differ.
export { ProcessTaskType, ProcessTaskStatus };
