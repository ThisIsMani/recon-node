// Domain Model for StagingEntry Entity

import { 
    StagingEntry as PrismaStagingEntry, 
    EntryType, 
    StagingEntryStatus, 
    StagingEntryProcessingMode 
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// The core StagingEntry domain model.
export interface StagingEntry extends PrismaStagingEntry {
  // Ensure amount is consistently Decimal or number based on domain needs.
  // PrismaStagingEntry has 'amount' as Decimal.
  // For now, inheriting PrismaStagingEntry's Decimal type for amount.

  // Domain-specific properties or methods can be added here.
}

// Re-export enums if used directly in domain logic,
// or define domain-specific enums if they differ.
export { EntryType, StagingEntryStatus, StagingEntryProcessingMode };

// Domain concept of a StagingEntry with its related Account
import { Account } from './account.types'; // Import Account domain model

export interface StagingEntryWithAccount extends StagingEntry {
  account?: Account; // Use Account domain model
}
