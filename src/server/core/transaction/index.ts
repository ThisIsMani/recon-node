import prisma from '../../../services/prisma';
import logger from '../../../services/logger';
import { Transaction as PrismaTransaction, Entry as PrismaEntry, TransactionStatus, EntryType, EntryStatus as PrismaEntryStatusEnum, Prisma, MerchantAccount } from '@prisma/client'; // Added EntryStatus, aliased PrismaEntryStatusEnum
import { Transaction } from '../../domain_models/transaction.types'; // Import Domain Model for Transaction
// Assuming Entry domain model will be created, for now use PrismaEntry or a placeholder
// import { Entry as DomainEntry } from '../../domain_models/entry.types'; 
import * as entryCore from '../entry'; // Now TS
import type { CreateEntryInternalData as EntryCoreCreateEntryData } from '../entry'; // Explicit type import
import { AppError, InternalServerError } from '../../../errors/AppError'; // Import AppError and InternalServerError
import { TransactionValidationError, TransactionNotFoundError, BalanceError as TransactionBalanceError, TransactionCreationError } from './errors';

// Re-export BalanceError for backward compatibility
export { BalanceError } from './errors';

// Interface for query parameters when listing transactions
interface ListTransactionsQueryParams {
  status?: TransactionStatus;
  logical_transaction_id?: string;
  version?: string; // Keep as string from query, parse to int in logic
}

// Type for the transaction shell data
interface TransactionShellData {
  merchant_id: string;
  status: TransactionStatus;
  logical_transaction_id?: string;
  version?: number;
  metadata?: Prisma.InputJsonValue;
}

// Type for entry data passed to createTransactionInternal
// This should align with CreateEntryInternalData in entryCore, but without transaction_id
interface EntryDataForTransaction {
  account_id: string;
  entry_type: EntryType;
  amount: number | Prisma.Decimal;
  currency: string;
  status: PrismaEntryStatusEnum; // Use aliased Prisma EntryStatus enum
  effective_date: string | Date;
  metadata?: Prisma.InputJsonValue;
  discarded_at?: string | Date | null;
}

// Type for the returned transaction, including its entries, using Domain models (or Prisma types as placeholders)
// This could be moved to domain_models/transaction.types.ts if preferred
export type TransactionWithEntries = Transaction & { // Use Domain Transaction
  entries: PrismaEntry[]; // Placeholder: Use DomainEntry[] once defined
};

/**
 * Lists transactions for a specific merchant, with optional filtering.
 */
const listTransactions = async (merchantId: string, queryParams: ListTransactionsQueryParams = {}): Promise<Array<Transaction & { entries: Array<PrismaEntry & { account: { account_id: string; account_name: string; merchant_id: string; account_type: string } }> }>> => { // Return array of Domain Transaction
  const { status, logical_transaction_id, version } = queryParams;
  const whereClause: Prisma.TransactionWhereInput = { merchant_id: merchantId };

  if (status) {
    if (Object.values(TransactionStatus).includes(status)) {
      whereClause.status = status;
    } else {
      logger.warn(`Invalid transaction status query parameter: ${status}`);
    }
  }
  if (logical_transaction_id) {
    whereClause.logical_transaction_id = logical_transaction_id;
  }
  if (version) {
    const versionInt = parseInt(version, 10);
    if (!isNaN(versionInt)) {
      whereClause.version = versionInt;
    } else {
      logger.warn(`Invalid version query parameter (not a number): ${version}`);
    }
  }

  try {
    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        entries: {
          include: {
            account: {
              select: {
                account_id: true,
                account_name: true,
                merchant_id: true,
                account_type: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    return transactions as Array<Transaction & { entries: Array<PrismaEntry & { account: { account_id: string; account_name: string; merchant_id: string; account_type: string } }> }>; // Cast to Domain Transaction
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(error as Error, { context: `Error fetching transactions for merchant ${merchantId}` });
    throw new InternalServerError('Could not retrieve transactions.', { merchantId }, error as Error);
  }
};

/**
 * Creates a new transaction internally, along with its associated entries.
 */
const createTransactionInternal = async (
  transactionShellData: TransactionShellData,
  actualEntryData: EntryDataForTransaction,
  expectedEntryData: EntryDataForTransaction,
  callingTx?: Prisma.TransactionClient
): Promise<TransactionWithEntries> => {
  const {
    merchant_id,
    status,
    logical_transaction_id,
    version,
    metadata,
  } = transactionShellData;

  if (!merchant_id || !status) {
    throw new TransactionValidationError('Missing required fields for transaction shell: merchant_id, status.', {
      missingFields: ['merchant_id', 'status'].filter(field => !transactionShellData[field as keyof TransactionShellData])
    });
  }
  if (!Object.values(TransactionStatus).includes(status)) {
    throw new TransactionValidationError(`Invalid transaction status: ${status}`, {
      providedStatus: status,
      validStatuses: Object.values(TransactionStatus)
    });
  }
  if (!actualEntryData || !expectedEntryData) {
    throw new TransactionValidationError('Actual and expected entry data must be provided.', {
      missingData: {
        actualEntryData: !actualEntryData,
        expectedEntryData: !expectedEntryData
      }
    });
  }

  const prismaClient = callingTx || prisma;

  const merchant = await prismaClient.merchantAccount.findUnique({ where: { merchant_id } });
  if (!merchant) {
    throw new TransactionValidationError(`Merchant with ID ${merchant_id} not found.`, {
      merchantId: merchant_id
    });
  }

  const actualAmount = new Prisma.Decimal(actualEntryData.amount.toString());
  const expectedAmount = new Prisma.Decimal(expectedEntryData.amount.toString());

  if (actualAmount.comparedTo(expectedAmount) !== 0) {
    throw new TransactionBalanceError(`Amounts do not balance: actual ${actualAmount}, expected ${expectedAmount}`, {
      actualAmount: actualAmount.toString(),
      expectedAmount: expectedAmount.toString()
    });
  }
  if (actualEntryData.currency !== expectedEntryData.currency) {
    throw new TransactionBalanceError(`Currencies do not match: actual ${actualEntryData.currency}, expected ${expectedEntryData.currency}`, {
      actualCurrency: actualEntryData.currency,
      expectedCurrency: expectedEntryData.currency
    });
  }
  if (!((actualEntryData.entry_type === EntryType.DEBIT && expectedEntryData.entry_type === EntryType.CREDIT) ||
        (actualEntryData.entry_type === EntryType.CREDIT && expectedEntryData.entry_type === EntryType.DEBIT))) {
    throw new TransactionBalanceError('Entry types must be one DEBIT and one CREDIT.', {
      actualEntryType: actualEntryData.entry_type,
      expectedEntryType: expectedEntryData.entry_type
    });
  }
  
  try {
    const executeInTransaction = async (txInstance: Prisma.TransactionClient): Promise<TransactionWithEntries> => {
      const newTransaction = await txInstance.transaction.create({
        data: {
          merchant_id,
          status,
          logical_transaction_id: logical_transaction_id || undefined,
          version: version || undefined, // Prisma handles default if undefined
          amount: actualAmount.abs(), // Store absolute value
          currency: actualEntryData.currency,
          metadata: metadata || Prisma.JsonNull,
        },
      });

      const finalActualEntryData: entryCore.CreateEntryInternalData = {
        ...actualEntryData,
        transaction_id: newTransaction.transaction_id,
        amount: actualAmount, // Use Prisma.Decimal
      };
      const finalExpectedEntryData: entryCore.CreateEntryInternalData = {
        ...expectedEntryData,
        transaction_id: newTransaction.transaction_id,
        amount: expectedAmount, // Use Prisma.Decimal
      };

      const createdActualEntry = await entryCore.createEntryInternal(finalActualEntryData, txInstance);
      const createdExpectedEntry = await entryCore.createEntryInternal(finalExpectedEntryData, txInstance);

      return { ...newTransaction, entries: [createdActualEntry, createdExpectedEntry] };
    };

    if (callingTx) {
      return await executeInTransaction(callingTx);
    } else {
      return await prisma.$transaction(executeInTransaction);
    }
  } catch (error) {
    if (error instanceof AppError) { // This includes BalanceError
      logger.error(error, { context: `Error during atomic transaction creation for merchant ${merchant_id}` });
      throw error;
    }
    logger.error(error as Error, { context: `Error during atomic transaction creation for merchant ${merchant_id}` });
    throw new TransactionCreationError('Could not create internal transaction with entries due to an internal error.', {
      merchantId: merchant_id,
      transactionData: {
        status,
        logical_transaction_id,
        version
      }
    }, error as Error);
  }
};

export {
  listTransactions,
  createTransactionInternal,
  // BalanceError is already exported by its class definition
};
