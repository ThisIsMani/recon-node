import prisma from '../../../services/prisma';
import logger from '../../../services/logger';
import { ReconRule as PrismaReconRulePrisma, Account as PrismaAccount, Prisma } from '@prisma/client'; // Renamed PrismaReconRule
import { ReconRule } from '../../domain_models/recon_rule.types'; // Import Domain Model
import { AppError, NotFoundError, ValidationError, InternalServerError } from '../../../errors/AppError';
import { findUniqueOrThrow, ensureEntityBelongsToMerchant } from '../../../services/databaseHelpers'; 

// Interface for the data required to create a recon rule
// This can align with CreateReconRuleRequest from API models or be a specific domain input type
export interface CreateReconRuleInput { // Renamed and can be exported
  merchant_id: string;
  account_one_id: string;
  account_two_id: string;
  // Add other fields from ReconRule model if they are part of creation data
  // e.g., description?: string;
}

// Define a type for Prisma errors
type PrismaError = Error & {
    code?: string;
    meta?: {
        target?: string[];
    };
};

// Define the output type for listReconRules, including nested account details, using Domain Model
type ReconRuleWithAccounts = ReconRule & { // Use Domain ReconRule
  accountOne: Pick<PrismaAccount, 'account_id' | 'account_name' | 'merchant_id'> | null; // Related models can remain Prisma types
  accountTwo: Pick<PrismaAccount, 'account_id' | 'account_name' | 'merchant_id'> | null; // Related models can remain Prisma types
};


async function createReconRule(data: CreateReconRuleInput): Promise<ReconRule> { // Return Domain ReconRule
  const { merchant_id, account_one_id, account_two_id } = data;

  if (!merchant_id || !account_one_id || !account_two_id) {
    throw new ValidationError('merchant_id, account_one_id, and account_two_id are required.');
  }

  if (account_one_id === account_two_id) {
    throw new ValidationError('Account IDs for a rule must be different.');
  }

  await findUniqueOrThrow<import('@prisma/client').MerchantAccount>(
    Prisma.ModelName.MerchantAccount,
    { where: { merchant_id } },
    'Merchant',
    merchant_id
  );

  await findUniqueOrThrow<PrismaAccount>(
    Prisma.ModelName.Account,
    { where: { account_id: account_one_id } },
    'Account (account_one_id)',
    account_one_id
  );
  
  await findUniqueOrThrow<PrismaAccount>(
    Prisma.ModelName.Account,
    { where: { account_id: account_two_id } },
    'Account (account_two_id)',
    account_two_id
  );

  try {
    const newRule = await prisma.reconRule.create({
      data: {
        merchant_id,
        account_one_id,
        account_two_id,
        // description: data.description, // if description is part of CreateReconRuleInput
      },
    });
    return newRule as ReconRule; // Cast to Domain model
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const prismaError = error as PrismaError;
    if (prismaError.code === 'P2002') { // Unique constraint violation
      throw new ValidationError('A reconciliation rule with these account IDs already exists for this merchant.');
    }
    logger.error(error as Error, { context: 'Error creating recon rule' });
    throw new InternalServerError('Could not create recon rule.');
  }
}

async function listReconRules(merchant_id: string): Promise<ReconRuleWithAccounts[]> {
  try {
    const rules = await prisma.reconRule.findMany({
      where: {
        merchant_id: merchant_id,
      },
      include: {
        accountOne: {
          select: {
            account_id: true,
            account_name: true,
            merchant_id: true, // useful to confirm which merchant accountOne belongs to
          },
        },
        accountTwo: {
          select: {
            account_id: true,
            account_name: true,
            merchant_id: true, // useful to confirm which merchant accountTwo belongs to
          },
        },
      },
    });
    return rules as ReconRuleWithAccounts[]; // Cast to array of Domain model with relations
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(error as Error, { context: 'Error listing recon rules' });
    throw new InternalServerError('Could not list recon rules.');
  }
}

async function deleteReconRule(merchant_id: string, rule_id: string): Promise<ReconRule> { // Return Domain ReconRule
  try {
    // First, ensure the rule exists and belongs to the merchant
    const rule = await findUniqueOrThrow<PrismaReconRulePrisma>( // Use aliased PrismaReconRule
        Prisma.ModelName.ReconRule,
        { where: { id: rule_id } },
        'Recon rule',
        rule_id
    );

    ensureEntityBelongsToMerchant(rule, merchant_id, 'Recon rule', rule_id);
    
    const deletedPrismaRule = await prisma.reconRule.delete({
      where: {
        id: rule_id,
        // merchant_id: merchant_id, // This is implicitly checked by the findUnique above
      },
    });
    return deletedPrismaRule as ReconRule; // Cast to Domain model
  } catch (error) {
    if (error instanceof AppError) { // This will catch NotFoundError from findUniqueOrThrow or ensureEntityBelongsToMerchant
      logger.error(error, { context: `AppError in deleteReconRule for rule ${rule_id}`}); // Log it before re-throwing
      throw error;
    }
    const prismaError = error as PrismaError;
    if (process.env.NODE_ENV !== 'test') {
      logger.error(prismaError, { context: `Error deleting recon rule ${rule_id}` });
    }
    // P2025 means "An operation failed because it depends on one or more records that were required but not found."
    // This could happen if the rule was deleted between the find and the delete operations.
    if (prismaError.code === 'P2025') { 
        throw new NotFoundError(`Recon rule with ID ${rule_id} not found for deletion (or was deleted by another process).`);
    }
    throw new InternalServerError(`Could not delete recon rule ${rule_id}.`);
  }
}

export {
  createReconRule,
  listReconRules,
  deleteReconRule,
};
