// Domain Model for Entry Entity

import { Entry as PrismaEntry, EntryType, EntryStatus as PrismaEntryStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// The core Entry domain model.
export interface Entry extends PrismaEntry {
  // Ensure amount is consistently Decimal or number based on domain needs.
  // PrismaEntry has 'amount' as Decimal.
  // If the domain model needs it as number, a transformation or getter might be needed.
  // For now, inheriting PrismaEntry's Decimal type for amount.
  
  // Domain-specific properties or methods can be added here.
  // For example:
  // isDebit(): boolean;
  // isCredit(): boolean;
}

// Re-export enums if used directly in domain logic,
// or define domain-specific enums if they differ.
export { EntryType, PrismaEntryStatus as EntryStatus }; // Alias PrismaEntryStatus to EntryStatus for domain use
