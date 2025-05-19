const prisma = require('../../../services/prisma');

async function createReconRule(data) {
  const { account_one_id, account_two_id } = data;

  if (!account_one_id || !account_two_id) {
    throw new Error('Both account_one_id and account_two_id are required.');
  }

  if (account_one_id === account_two_id) {
    throw new Error('Account IDs for a rule must be different.');
  }

  // Check if both accounts exist
  const accountOne = await prisma.account.findUnique({ where: { account_id: account_one_id } });
  if (!accountOne) {
    throw new Error(`Account with ID ${account_one_id} not found.`);
  }
  const accountTwo = await prisma.account.findUnique({ where: { account_id: account_two_id } });
  if (!accountTwo) {
    throw new Error(`Account with ID ${account_two_id} not found.`);
  }

  try {
    const newRule = await prisma.reconRule.create({
      data: {
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

async function listReconRules() {
  try {
    const rules = await prisma.reconRule.findMany({
      include: {
        accountOne: { select: { account_id: true, account_name: true, merchant_id: true } },
        accountTwo: { select: { account_id: true, account_name: true, merchant_id: true } },
      }
    });
    return rules;
  } catch (error) {
    console.error('Error listing recon rules:', error);
    throw new Error('Could not list recon rules.');
  }
}

module.exports = {
  createReconRule,
  listReconRules,
};
