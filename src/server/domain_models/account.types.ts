// Domain Model for Account Entity

import { Account as PrismaAccount, AccountType } from '@prisma/client';

// The core Account domain model.
// Extends the Prisma model, allowing for future domain-specific properties or methods.
export interface Account extends PrismaAccount {
  // Domain-specific properties or methods can be added here.
  // For example:
  // getBalance(): Promise<Decimal>;
  // isOverdrawn(): boolean;
}

// Re-export AccountType if it's used directly in domain logic,
// or define a domain-specific enum if it differs.
export { AccountType };
