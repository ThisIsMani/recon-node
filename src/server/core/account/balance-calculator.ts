import prisma from '../../../services/prisma';
import { AccountType, EntryType, EntryStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface EntrySums {
  postedDebits: Decimal;
  postedCredits: Decimal;
  pendingDebits: Decimal;
  pendingCredits: Decimal;
}

interface AccountBalances {
  posted_balance: string;
  pending_balance: string;
  available_balance: string;
}

async function getEntrySums(accountId: string): Promise<EntrySums> {
  const [postedSums, pendingSums] = await Promise.all([
    // Get posted entry sums
    prisma.entry.groupBy({
      by: ['entry_type'],
      where: {
        account_id: accountId,
        status: EntryStatus.POSTED,
      },
      _sum: {
        amount: true,
      },
    }),
    // Get pending entry sums (posted + expected)
    prisma.entry.groupBy({
      by: ['entry_type'],
      where: {
        account_id: accountId,
        status: {
          in: [EntryStatus.POSTED, EntryStatus.EXPECTED],
        },
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  // Extract sums from grouped results
  const postedDebits = postedSums.find(s => s.entry_type === EntryType.DEBIT)?._sum.amount || new Decimal(0);
  const postedCredits = postedSums.find(s => s.entry_type === EntryType.CREDIT)?._sum.amount || new Decimal(0);
  const pendingDebits = pendingSums.find(s => s.entry_type === EntryType.DEBIT)?._sum.amount || new Decimal(0);
  const pendingCredits = pendingSums.find(s => s.entry_type === EntryType.CREDIT)?._sum.amount || new Decimal(0);

  return {
    postedDebits,
    postedCredits,
    pendingDebits,
    pendingCredits,
  };
}

export async function calculateAccountBalances(
  accountId: string,
  accountType: AccountType
): Promise<AccountBalances> {
  const { postedDebits, postedCredits, pendingDebits, pendingCredits } = await getEntrySums(accountId);

  let postedBalance: Decimal;
  let pendingBalance: Decimal;
  let availableBalance: Decimal;

  if (accountType === AccountType.DEBIT_NORMAL) {
    // For debit normal accounts (Assets, Expenses)
    postedBalance = postedDebits.sub(postedCredits);
    pendingBalance = pendingDebits.sub(pendingCredits);
    availableBalance = postedDebits.sub(pendingCredits);
  } else {
    // For credit normal accounts (Liabilities, Revenue, Equity)
    postedBalance = postedCredits.sub(postedDebits);
    pendingBalance = pendingCredits.sub(pendingDebits);
    availableBalance = postedCredits.sub(pendingDebits);
  }

  return {
    posted_balance: postedBalance.toFixed(2),
    pending_balance: pendingBalance.toFixed(2),
    available_balance: availableBalance.toFixed(2),
  };
}

export async function calculateMultipleAccountBalances(
  accounts: Array<{ account_id: string; account_type: AccountType }>
): Promise<Map<string, AccountBalances>> {
  // Calculate balances for all accounts in parallel
  const balancePromises = accounts.map(async (account) => {
    const balances = await calculateAccountBalances(account.account_id, account.account_type);
    return { accountId: account.account_id, balances };
  });

  const results = await Promise.all(balancePromises);

  // Return as a Map for easy lookup
  const balanceMap = new Map<string, AccountBalances>();
  results.forEach(({ accountId, balances }) => {
    balanceMap.set(accountId, balances);
  });

  return balanceMap;
}