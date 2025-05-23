// Domain Model for Transaction Entity

import { Transaction as PrismaTransaction, TransactionStatus, Entry } from '@prisma/client';
// Assuming a domain model for Entry might exist or will be created:
// import { Entry as DomainEntry } from './entry.types'; 

// The core Transaction domain model.
export interface Transaction extends PrismaTransaction {
  // entries?: DomainEntry[]; // If entries are typically loaded with transactions in domain logic
  // Domain-specific properties or methods can be added here.
  // For example:
  // isBalanced(): boolean;
  // getTotalAmount(): Decimal;
}

// Re-export TransactionStatus if it's used directly in domain logic,
// or define a domain-specific enum if it differs.
export { TransactionStatus };

// Potentially, a type for a transaction with its entries, if commonly used:
// export interface TransactionWithEntries extends Transaction {
//   entries: DomainEntry[];
// }
