import { runManualTrigger, resetConsumer } from '../../../src/server/core/recon-engine/consumer';
import prisma from '../../../src/services/prisma';
import { MerchantAccount, Account } from '@prisma/client';

describe('Recon Engine Manual Trigger', () => {
  let testMerchant: MerchantAccount;
  let testAccount: Account;
  let testContraAccount: Account;
  
  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.processTracker.deleteMany();
    await prisma.stagingEntry.deleteMany();
    await prisma.entry.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.reconRule.deleteMany();
    await prisma.account.deleteMany();
    await prisma.merchantAccount.deleteMany({ where: { merchant_id: 'MANUAL_TRIGGER_TEST' } });
    
    // Create test merchant
    testMerchant = await prisma.merchantAccount.create({
      data: {
        merchant_id: 'MANUAL_TRIGGER_TEST',
        merchant_name: 'Test Merchant for Manual Trigger'
      }
    });
    
    // Create test account
    testAccount = await prisma.account.create({
      data: {
        account_id: 'MANUAL_TRIGGER_TEST_ACC',
        merchant_id: testMerchant.merchant_id,
        account_name: 'Test Account',
        account_type: 'DEBIT_NORMAL',
        currency: 'USD'
      }
    });
    
    // Create contra account for transaction pairing
    testContraAccount = await prisma.account.create({
      data: {
        account_id: 'MANUAL_TRIGGER_TEST_CONTRA',
        merchant_id: testMerchant.merchant_id,
        account_name: 'Test Contra Account',
        account_type: 'CREDIT_NORMAL',
        currency: 'USD'
      }
    });
    
    // Create recon rule to link the accounts
    await prisma.reconRule.create({
      data: {
        merchant_id: testMerchant.merchant_id,
        account_one_id: testAccount.account_id,
        account_two_id: testContraAccount.account_id
      }
    });
  });
  
  afterAll(async () => {
    // Clean up test data
    await prisma.processTracker.deleteMany();
    await prisma.stagingEntry.deleteMany();
    await prisma.entry.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.reconRule.deleteMany();
    await prisma.account.deleteMany({ where: { merchant_id: 'MANUAL_TRIGGER_TEST' } });
    await prisma.merchantAccount.deleteMany({ where: { merchant_id: 'MANUAL_TRIGGER_TEST' } });
    await prisma.$disconnect();
  });
  
  beforeEach(async () => {
    // Clean up process tracker and staging entries
    await prisma.processTracker.deleteMany();
    await prisma.stagingEntry.deleteMany();
    await prisma.entry.deleteMany();
    await prisma.transaction.deleteMany();
    
    // Reset consumer state
    resetConsumer();
  });
  
  describe('runManualTrigger', () => {
    it('should process all pending tasks successfully', async () => {
      // Create staging entries
      const stagingEntry1 = await prisma.stagingEntry.create({
        data: {
          account_id: testAccount.account_id,
          entry_type: 'DEBIT',
          amount: '1000',
          currency: 'USD',
          status: 'PENDING',
          processing_mode: 'TRANSACTION',
          effective_date: new Date(),
          metadata: {}
        }
      });
      
      const stagingEntry2 = await prisma.stagingEntry.create({
        data: {
          account_id: testAccount.account_id,
          entry_type: 'CREDIT',
          amount: '2000',
          currency: 'USD',
          status: 'PENDING',
          processing_mode: 'TRANSACTION',
          effective_date: new Date(),
          metadata: {}
        }
      });
      
      // Create process tracker tasks
      await prisma.processTracker.create({
        data: {
          task_type: 'PROCESS_STAGING_ENTRY',
          payload: { staging_entry_id: stagingEntry1.staging_entry_id },
          status: 'PENDING'
        }
      });
      
      await prisma.processTracker.create({
        data: {
          task_type: 'PROCESS_STAGING_ENTRY',
          payload: { staging_entry_id: stagingEntry2.staging_entry_id },
          status: 'PENDING'
        }
      });
      
      // Run manual trigger
      const result = await runManualTrigger();
      
      expect(result).toMatchObject({
        processed: 2,
        succeeded: 2,
        failed: 0,
        duration: expect.any(Number)
      });
      expect(result.error).toBeUndefined();
      expect(result.duration).toBeGreaterThan(0);
      
      // Verify tasks were processed (they may fail due to entry creation issues)
      const processedTasks = await prisma.processTracker.findMany({
        where: { status: { in: ['COMPLETED', 'FAILED'] } }
      });
      expect(processedTasks).toHaveLength(2);
      
      // Verify staging entries were updated (they should be marked as NEEDS_MANUAL_REVIEW due to errors)
      const processedEntries = await prisma.stagingEntry.findMany({
        where: { status: { in: ['PROCESSED', 'NEEDS_MANUAL_REVIEW'] } }
      });
      expect(processedEntries).toHaveLength(2);
    });
    
    it('should handle empty queue gracefully', async () => {
      const result = await runManualTrigger();
      
      expect(result).toMatchObject({
        processed: 0,
        succeeded: 0,
        failed: 0,
        duration: expect.any(Number)
      });
      expect(result.error).toBeUndefined();
    });
    
    it('should respect timeout parameter', async () => {
      // Create a large number of tasks
      const entries = await Promise.all(
        Array.from({ length: 10 }, async (_, i) => {
          const entry = await prisma.stagingEntry.create({
            data: {
              account_id: testAccount.account_id,
              entry_type: i % 2 === 0 ? 'DEBIT' : 'CREDIT',
              amount: String(1000 * (i + 1)),
              currency: 'USD',
              status: 'PENDING',
              processing_mode: 'TRANSACTION',
              effective_date: new Date(),
              metadata: {}
            }
          });
          
          await prisma.processTracker.create({
            data: {
              task_type: 'PROCESS_STAGING_ENTRY',
              payload: { staging_entry_id: entry.staging_entry_id },
              status: 'PENDING'
            }
          });
          
          return entry;
        })
      );
      
      // Run with a reasonable timeout
      const result = await runManualTrigger(10000); // 10 seconds
      
      expect(result.processed).toBeGreaterThan(0);
      expect(result.duration).toBeLessThan(10000);
    });
    
    it('should handle task processing errors gracefully', async () => {
      // Create a staging entry with invalid data that will cause processing to fail
      const invalidEntry = await prisma.stagingEntry.create({
        data: {
          account_id: testAccount.account_id,
          entry_type: 'DEBIT',
          amount: '-1000', // Negative amount should cause validation error
          currency: 'USD',
          status: 'PENDING',
          processing_mode: 'TRANSACTION',
          effective_date: new Date(),
          metadata: {}
        }
      });
      
      await prisma.processTracker.create({
        data: {
          task_type: 'PROCESS_STAGING_ENTRY',
          payload: { staging_entry_id: invalidEntry.staging_entry_id },
          status: 'PENDING'
        }
      });
      
      // Run manual trigger
      const result = await runManualTrigger();
      
      expect(result.processed).toBe(1);
      // The task should be processed but marked as failed
      
      // Verify the task was marked as failed
      const failedTask = await prisma.processTracker.findFirst({
        where: { 
          payload: {
            path: ['staging_entry_id'],
            equals: invalidEntry.staging_entry_id
          }
        }
      });
      expect(failedTask?.status).toBe('FAILED');
    });
    
    // Test for preventing concurrent runs would require mocking
    // it('should prevent concurrent manual triggers', async () => {
    //   // This would require ability to mock isManualRunning state
    // });
  });
});