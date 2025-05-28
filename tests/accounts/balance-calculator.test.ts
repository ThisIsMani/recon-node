import { calculateAccountBalances, calculateMultipleAccountBalances } from '../../src/server/core/account/balance-calculator';
import prisma from '../../src/services/prisma';
import { AccountType, EntryType, EntryStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

jest.mock('../../src/services/prisma', () => ({
  __esModule: true,
  default: {
    entry: {
      groupBy: jest.fn(),
    },
  },
}));

const mockGroupBy = prisma.entry.groupBy as jest.MockedFunction<typeof prisma.entry.groupBy>;

describe('Balance Calculator', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateAccountBalances', () => {
    it('should calculate balances for DEBIT_NORMAL account correctly', async () => {
      const accountId = 'acc123';
      
      // Mock posted sums
      const postedSums = [
        { entry_type: EntryType.DEBIT, _sum: { amount: new Decimal(1000) } },
        { entry_type: EntryType.CREDIT, _sum: { amount: new Decimal(300) } },
      ];
      
      // Mock pending sums (posted + expected)
      const pendingSums = [
        { entry_type: EntryType.DEBIT, _sum: { amount: new Decimal(1500) } }, // 1000 posted + 500 expected
        { entry_type: EntryType.CREDIT, _sum: { amount: new Decimal(700) } }, // 300 posted + 400 expected
      ];

      mockGroupBy
        .mockResolvedValueOnce(postedSums as any)
        .mockResolvedValueOnce(pendingSums as any);

      const result = await calculateAccountBalances(accountId, AccountType.DEBIT_NORMAL);

      expect(result).toEqual({
        posted_balance: '700.00', // 1000 - 300
        pending_balance: '800.00', // 1500 - 700
        available_balance: '300.00', // 1000 - 700 (posted debits - pending credits)
      });

      expect(mockGroupBy).toHaveBeenCalledTimes(2);
    });

    it('should calculate balances for CREDIT_NORMAL account correctly', async () => {
      const accountId = 'acc456';
      
      // Mock posted sums
      const postedSums = [
        { entry_type: EntryType.DEBIT, _sum: { amount: new Decimal(200) } },
        { entry_type: EntryType.CREDIT, _sum: { amount: new Decimal(1000) } },
      ];
      
      // Mock pending sums (posted + expected)
      const pendingSums = [
        { entry_type: EntryType.DEBIT, _sum: { amount: new Decimal(600) } }, // 200 posted + 400 expected
        { entry_type: EntryType.CREDIT, _sum: { amount: new Decimal(1500) } }, // 1000 posted + 500 expected
      ];

      mockGroupBy
        .mockResolvedValueOnce(postedSums as any)
        .mockResolvedValueOnce(pendingSums as any);

      const result = await calculateAccountBalances(accountId, AccountType.CREDIT_NORMAL);

      expect(result).toEqual({
        posted_balance: '800.00', // 1000 - 200
        pending_balance: '900.00', // 1500 - 600
        available_balance: '400.00', // 1000 - 600 (posted credits - pending debits)
      });
    });

    it('should handle accounts with no entries', async () => {
      const accountId = 'acc789';
      
      // Mock empty results
      mockGroupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await calculateAccountBalances(accountId, AccountType.DEBIT_NORMAL);

      expect(result).toEqual({
        posted_balance: '0.00',
        pending_balance: '0.00',
        available_balance: '0.00',
      });
    });

    it('should handle accounts with only debit entries', async () => {
      const accountId = 'acc101';
      
      const postedSums = [
        { entry_type: EntryType.DEBIT, _sum: { amount: new Decimal(500) } },
      ];
      
      const pendingSums = [
        { entry_type: EntryType.DEBIT, _sum: { amount: new Decimal(750) } },
      ];

      mockGroupBy
        .mockResolvedValueOnce(postedSums as any)
        .mockResolvedValueOnce(pendingSums as any);

      const result = await calculateAccountBalances(accountId, AccountType.DEBIT_NORMAL);

      expect(result).toEqual({
        posted_balance: '500.00', // 500 - 0
        pending_balance: '750.00', // 750 - 0
        available_balance: '500.00', // 500 - 0
      });
    });

    it('should handle negative balances correctly', async () => {
      const accountId = 'acc102';
      
      const postedSums = [
        { entry_type: EntryType.DEBIT, _sum: { amount: new Decimal(100) } },
        { entry_type: EntryType.CREDIT, _sum: { amount: new Decimal(500) } },
      ];
      
      const pendingSums = [
        { entry_type: EntryType.DEBIT, _sum: { amount: new Decimal(100) } },
        { entry_type: EntryType.CREDIT, _sum: { amount: new Decimal(800) } },
      ];

      mockGroupBy
        .mockResolvedValueOnce(postedSums as any)
        .mockResolvedValueOnce(pendingSums as any);

      const result = await calculateAccountBalances(accountId, AccountType.DEBIT_NORMAL);

      expect(result).toEqual({
        posted_balance: '-400.00', // 100 - 500
        pending_balance: '-700.00', // 100 - 800
        available_balance: '-700.00', // 100 - 800
      });
    });

    it('should query with correct filters', async () => {
      const accountId = 'acc103';
      
      mockGroupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await calculateAccountBalances(accountId, AccountType.CREDIT_NORMAL);

      // Check first call (posted entries)
      expect(mockGroupBy).toHaveBeenNthCalledWith(1, {
        by: ['entry_type'],
        where: {
          account_id: accountId,
          status: EntryStatus.POSTED,
        },
        _sum: {
          amount: true,
        },
      });

      // Check second call (pending entries)
      expect(mockGroupBy).toHaveBeenNthCalledWith(2, {
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
      });
    });
  });

  describe('calculateMultipleAccountBalances', () => {
    it('should calculate balances for multiple accounts in parallel', async () => {
      const accounts = [
        { account_id: 'acc1', account_type: AccountType.DEBIT_NORMAL },
        { account_id: 'acc2', account_type: AccountType.CREDIT_NORMAL },
      ];

      // Mock for first account
      mockGroupBy
        .mockResolvedValueOnce([
          { entry_type: EntryType.DEBIT, _sum: { amount: new Decimal(100) } },
        ] as any)
        .mockResolvedValueOnce([
          { entry_type: EntryType.DEBIT, _sum: { amount: new Decimal(150) } },
        ] as any);

      // Mock for second account
      mockGroupBy
        .mockResolvedValueOnce([
          { entry_type: EntryType.CREDIT, _sum: { amount: new Decimal(200) } },
        ] as any)
        .mockResolvedValueOnce([
          { entry_type: EntryType.CREDIT, _sum: { amount: new Decimal(300) } },
        ] as any);

      const result = await calculateMultipleAccountBalances(accounts);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      
      expect(result.get('acc1')).toEqual({
        posted_balance: '100.00',
        pending_balance: '150.00',
        available_balance: '100.00',
      });
      
      expect(result.get('acc2')).toEqual({
        posted_balance: '200.00',
        pending_balance: '300.00',
        available_balance: '200.00',
      });

      expect(mockGroupBy).toHaveBeenCalledTimes(4); // 2 calls per account
    });

    it('should handle empty account list', async () => {
      const result = await calculateMultipleAccountBalances([]);
      
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
      expect(mockGroupBy).not.toHaveBeenCalled();
    });
  });
});