// Domain Model for Merchant Entity

import { MerchantAccount as PrismaMerchantAccount } from '@prisma/client';

// The core Merchant domain model.
// This can be an extension of the Prisma model if they are very similar,
// or a completely separate interface if the domain representation diverges significantly.
// For now, let's assume it's similar to the Prisma model but allows for future divergence.
export interface Merchant extends PrismaMerchantAccount {
  // Explicitly adding these, though they should be inherited from PrismaMerchantAccount
  // This can help with type inference in some test environments or complex scenarios.
  created_at: Date;
  updated_at: Date;
  // Domain-specific properties or methods can be added here.
  // For example, a calculated property or a business rule method:
  // isActive(): boolean;
  // getSegment(): string;
}

// Example of a more distinct domain model if needed:
// export interface Merchant {
//   id: string;
//   merchantName: string; // Different naming convention
//   status: 'active' | 'inactive' | 'suspended'; // More specific status than a boolean
//   registrationDate: Date;
//   // other domain-specific fields
// }

// You might also have types for specific domain operations or concepts
// related to Merchants that are not directly tied to API or DB.
// export type MerchantEligibilityStatus = 'eligible' | 'not_eligible' | 'pending_review';
