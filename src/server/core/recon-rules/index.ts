import prisma from '../../../services/prisma';
import logger from '../../../services/logger';
import { ReconRule as PrismaReconRule, Account as PrismaAccount } from '@prisma/client';

// Interface for the data required to create a recon rule
interface CreateReconRuleData {
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

// Define the output type for listReconRules, including nested account details
type ReconRuleWithAccounts = PrismaReconRule & {
  accountOne: Pick<PrismaAccount, 'account_id' | 'account_name' | 'merchant_id'> | null;
  accountTwo: Pick<PrismaAccount, 'account_id' | 'account_name' | 'merchant_id'> | null;
};


async function createReconRule(data: CreateReconRuleData): Promise<PrismaReconRule> {
  const { merchant_id, account_one_id, account_two_id } = data;

  if (!merchant_id || !account_one_id || !account_two_id) {
    throw new Error('merchant_id, account_one_id, and account_two_id are required.');
  }

  if (account_one_id === account_two_id) {
    throw new Error('Account IDs for a rule must be different.');
  }

  const merchant = await prisma.merchantAccount.findUnique({
    where: { merchant_id },
  });
  if (!merchant) {
    throw new Error(`Merchant with ID ${merchant_id} not found.`);
  }

  const accountOne = await prisma.account.findUnique({
    where: {
      account_id: account_one_id,
      // merchant_id: merchant_id, // account_one might not belong to the same merchant if it's a shared/central account
    },
  });
  if (!accountOne) {
    // Adjusted error message slightly as account_one might not be tied to *this* merchant
    throw new Error(`Account with ID ${account_one_id} (account_one_id) not found.`);
  }
  
  // Account two should typically belong to the same merchant as the rule, or be a global/system account.
  // The original code checked accountTwo without merchant_id context, which might be intentional.
  // If accountTwo must belong to the same merchant, the query should be:
  // where: { account_id: account_two_id, merchant_id: merchant_id }
  const accountTwo = await prisma.account.findUnique({ where: { account_id: account_two_id } });
  if (!accountTwo) {
    throw new Error(`Account with ID ${account_two_id} (account_two_id) not found.`);
  }

  try {
    const newRule = await prisma.reconRule.create({
      data: {
        merchant_id,
        account_one_id,
        account_two_id,
        // description: data.description, // if description is part of CreateReconRuleData
      },
    });
    return newRule;
  } catch (error) {
    const prismaError = error as PrismaError;
    if (prismaError.code === 'P2002') { // Unique constraint violation
      throw new Error('A reconciliation rule with these account IDs already exists for this merchant.');
    }
    logger.error('Error creating recon rule:', error);
    throw new Error('Could not create recon rule.');
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
    return rules as ReconRuleWithAccounts[]; // Cast needed because Prisma's include type is broader
  } catch (error) {
    logger.error('Error listing recon rules:', error);
    throw new Error('Could not list recon rules.');
  }
}

async function deleteReconRule(merchant_id: string, rule_id: string): Promise<PrismaReconRule> {
  try {
    // First, ensure the rule belongs to the merchant to prevent unauthorized deletion
    const rule = await prisma.reconRule.findUnique({
        where: { id: rule_id },
    });

    if (!rule) {
        const errorMessage = `Recon rule with ID ${rule_id} not found.`; // rule_id is now string
        throw new Error(errorMessage);
    }
    if (rule.merchant_id !== merchant_id) {
        const errorMessage = `Recon rule with ID ${rule_id} does not belong to merchant ${merchant_id}.`; // rule_id is now string
        throw new Error(errorMessage);
    }
    
    const deletedRule = await prisma.reconRule.delete({
      where: {
        id: rule_id,
        // merchant_id: merchant_id, // This is implicitly checked by the findUnique above
      },
    });
    return deletedRule;
  } catch (error) {
    const prismaError = error as PrismaError;
    if (process.env.NODE_ENV !== 'test') {
      logger.error('Error deleting recon rule:', error);
    }
    if (prismaError.message?.startsWith('Recon rule with ID')) throw prismaError;
    if (prismaError.code === 'P2025') { // Record to delete does not exist.
        const errorMessage = `Recon rule with ID ${rule_id} not found for deletion.`; // rule_id is now string
        throw new Error(errorMessage);
    }
    throw new Error('Could not delete recon rule.');
  }
}

export {
  createReconRule,
  listReconRules,
  deleteReconRule,
};
