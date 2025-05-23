// Domain Model for ReconRule Entity

import { ReconRule as PrismaReconRule } from '@prisma/client';

// The core ReconRule domain model.
export interface ReconRule extends PrismaReconRule {
  // Domain-specific properties or methods can be added here.
  // For example:
  // getRuleDescription(): string;
}

// If there are specific input types for creating/updating domain ReconRules,
// they can be defined here, separate from API request types if necessary.
// export interface CreateDomainReconRuleInput {
//   merchantId: string;
//   accountOneId: string;
//   accountTwoId: string;
//   // other domain-specific creation fields
// }
