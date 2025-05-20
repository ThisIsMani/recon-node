const prisma = require('../../../services/prisma');

async function createReconRule(data) {
  const { merchant_id, account_one_id, account_two_id } = data;

  if (!merchant_id || !account_one_id || !account_two_id) {
    throw new Error('merchant_id, account_one_id, and account_two_id are required.');
  }

  if (account_one_id === account_two_id) {
    throw new Error('Account IDs for a rule must be different.');
  }

  // Check if merchant exists
  const merchant = await prisma.merchantAccount.findUnique({
    where: { merchant_id },
  });
  if (!merchant) {
    throw new Error(`Merchant with ID ${merchant_id} not found.`);
  }

  // Check if both accounts exist and belong to the merchant
  const accountOne = await prisma.account.findUnique({
    where: {
      account_id: account_one_id,
      merchant_id: merchant_id,
    },
  });
  if (!accountOne) {
    throw new Error(`Account with ID ${account_one_id} not found.`);
  }
  const accountTwo = await prisma.account.findUnique({ where: { account_id: account_two_id } });
  if (!accountTwo) {
    throw new Error(`Account with ID ${account_two_id} not found or does not belong to merchant ${merchant_id}.`);
  }

  try {
    const newRule = await prisma.reconRule.create({
      data: {
        merchant_id,
        account_one_id,
        account_two_id,
      },
    });
    return newRule;
  } catch (error) {
    if (error.code === 'P2002') { // Unique constraint violation
      throw new Error('A reconciliation rule with these account IDs already exists.');
    }
    console.error('Error creating recon rule:', error);
    throw new Error('Could not create recon rule.');
  }
}

async function listReconRules(merchant_id) {
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
            merchant_id: true,
          },
        },
        accountTwo: {
          select: {
            account_id: true,
            account_name: true,
            merchant_id: true,
          },
        },
      },
    });
    return rules;
  } catch (error) {
    console.error('Error listing recon rules:', error);
    throw new Error('Could not list recon rules.');
  }
}

async function deleteReconRule(merchant_id, rule_id) {
  try {
    // Delete the rule if it belongs to the merchant
    const deletedRule = await prisma.reconRule.delete({
      where: {
        id_merchant_id: {
          id: rule_id,
          merchant_id: merchant_id,
        },
      },
    }).catch((error) => {
      if (error.code === 'P2025') { // Record not found
        throw new Error(`Recon rule with ID ${rule_id} not found or does not belong to merchant ${merchant_id}.`);
      }
      throw error;
    });
    return deletedRule;
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error deleting recon rule:', error);
    }
    if (error.message.startsWith('Recon rule with ID')) throw error;
    throw new Error('Could not delete recon rule.');
  }
}

module.exports = {
  createReconRule,
  listReconRules,
  deleteReconRule,
};
