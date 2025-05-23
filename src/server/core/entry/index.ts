import prisma from '../../../services/prisma';
import { EntryType, EntryStatus, Entry as PrismaEntry, Prisma, Account, Transaction } from '@prisma/client';
import logger from '../../../services/logger';

// Interface for query parameters when listing entries
interface ListEntriesQueryParams {
  status?: EntryStatus;
}

// Type for the data required to create an entry internally
export interface CreateEntryInternalData { // Added export
  account_id: string;
  transaction_id: string; // Now mandatory as per schema
  entry_type: EntryType;
  amount: number | Prisma.Decimal;
  currency: string;
  status: EntryStatus;
  effective_date: string | Date;
  metadata?: Prisma.InputJsonValue;
  discarded_at?: string | Date | null;
}

// Type for the returned entry from listEntries, including relations
type EntryWithRelations = PrismaEntry & {
  account: Pick<Account, 'account_id' | 'account_name' | 'merchant_id'> | null;
  transaction: Pick<Transaction, 'status' | 'transaction_id' | 'logical_transaction_id' | 'version'> | null;
};

/**
 * Lists entries for a specific account, with optional filtering.
 * @param accountId - The ID of the account.
 * @param queryParams - Query parameters for filtering (e.g., status).
 * @returns A promise that resolves to an array of entries with related account and transaction info.
 */
const listEntries = async (accountId: string, queryParams: ListEntriesQueryParams = {}): Promise<EntryWithRelations[]> => {
  const { status } = queryParams;
  const whereClause: Prisma.EntryWhereInput = { account_id: accountId };

  if (status) {
    if (Object.values(EntryStatus).includes(status)) {
      whereClause.status = status;
    } else {
      // Optionally handle invalid status query param, e.g., log a warning or throw an error
      logger.warn(`Invalid status query parameter: ${status}`);
    }
  }

  try {
    const entries = await prisma.entry.findMany({
      where: whereClause,
      include: {
        account: {
          select: {
            account_id: true,
            account_name: true,
            merchant_id: true
          }
        },
        transaction: {
          select: {
            status: true,
            transaction_id: true,
            logical_transaction_id: true,
            version: true
          }
        }
      },
      orderBy: {
        effective_date: 'desc'
      }
    });
    return entries as EntryWithRelations[]; // Cast because Prisma's include type is broader
  } catch (error) {
    logger.error(`Error fetching entries for account ${accountId}:`, error);
    throw new Error('Could not retrieve entries.');
  }
};

/**
 * Creates a new entry internally. Not exposed via API.
 * Used by system processes like the Recon Engine.
 * @param entryData - Data for the new entry.
 * @param tx - Optional: Prisma transaction client.
 * @returns The newly created entry object.
 */
const createEntryInternal = async (
  entryData: CreateEntryInternalData,
  tx?: Prisma.TransactionClient
): Promise<PrismaEntry> => {
  const {
    account_id,
    transaction_id, // transaction_id is now mandatory
    entry_type,
    amount,
    currency,
    status,
    effective_date,
    metadata,
    discarded_at,
  } = entryData;

  // transaction_id is now required by schema, so it must be present in entryData
  if (!account_id || !transaction_id || !entry_type || amount == null || !currency || !status || !effective_date) {
    throw new Error('Missing required fields for internal entry creation: account_id, transaction_id, entry_type, amount, currency, status, effective_date.');
  }
  // Validation for enums is implicitly handled by TypeScript types if entryData is correctly typed at call site.
  // However, runtime checks can be useful if data source is less certain.
  if (!Object.values(EntryType).includes(entry_type)) {
    throw new Error(`Invalid entry_type: ${entry_type}`);
  }
  if (!Object.values(EntryStatus).includes(status)) {
    throw new Error(`Invalid entry status: ${status}`);
  }

  const prismaClient = tx || prisma;

  // Account existence check
  const account = await prismaClient.account.findUnique({ where: { account_id } });
  if (!account) {
    throw new Error(`Account with ID ${account_id} not found for internal entry creation.`);
  }
  
  // Transaction existence check (only if not within a transaction that might be creating it)
  // Since transaction_id is mandatory, this check is more relevant.
  if (!tx) { 
    const transaction = await prismaClient.transaction.findUnique({ where: { transaction_id } });
    if (!transaction) {
      throw new Error(`Transaction with ID ${transaction_id} not found for internal entry creation.`);
    }
  }

  try {
    const newEntry = await prismaClient.entry.create({
      data: {
        account_id,
        transaction_id,
        entry_type,
        amount: new Prisma.Decimal(amount.toString()), // Ensure amount is Decimal
        currency,
        status,
        effective_date: new Date(effective_date),
        metadata: metadata || Prisma.JsonNull,
        discarded_at: discarded_at ? new Date(discarded_at) : null,
      },
    });
    return newEntry;
  } catch (error) {
    logger.error(`Error creating internal entry for account ${account_id}:`, error);
    // Consider more specific error handling for Prisma errors (e.g., P2002 for unique constraints if any)
    throw new Error('Could not create internal entry.');
  }
};

export {
  listEntries,
  createEntryInternal,
};
