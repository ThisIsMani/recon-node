import prisma from '../../../services/prisma';
import { EntryType, EntryStatus as PrismaEntryStatusEnum, Entry as PrismaEntry, Prisma, Account as PrismaAccount, Transaction as PrismaTransaction } from '@prisma/client'; // Aliased EntryStatus
import { Entry, EntryStatus } from '../../domain_models/entry.types'; // Import Domain Model for Entry and its aliased EntryStatus
import logger from '../../../services/logger';
import { AppError, NotFoundError, ValidationError, InternalServerError } from '../../../errors/AppError';

// Define a type for Prisma errors that include a 'code' and 'meta'
type PrismaError = Error & {
    code?: string;
    meta?: {
        target?: string[];
        message?: string;
    };
    name?: string; // Ensure name is part of the type
};

// Interface for query parameters when listing entries
interface ListEntriesQueryParams {
  status?: PrismaEntryStatusEnum; // Use aliased Prisma enum
}

// Type for the data required to create an entry internally
export interface CreateEntryInternalData { // Added export
  account_id: string;
  transaction_id: string; // Now mandatory as per schema
  entry_type: EntryType;
  amount: number | Prisma.Decimal;
  currency: string;
  status: PrismaEntryStatusEnum; // Use aliased Prisma enum
  effective_date: string | Date;
  metadata?: Prisma.InputJsonValue;
  discarded_at?: string | Date | null;
}

// Type for the returned entry from listEntries, including relations, using Domain Model
type EntryWithRelations = Entry & { // Use Domain Entry
  account: Pick<PrismaAccount, 'account_id' | 'account_name' | 'merchant_id'> | null; // Related models can remain Prisma types for now
  transaction: Pick<PrismaTransaction, 'status' | 'transaction_id' | 'logical_transaction_id' | 'version'> | null; // Related models can remain Prisma types for now
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
    if (Object.values(PrismaEntryStatusEnum).includes(status)) { // Use aliased Prisma enum
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
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(error as Error, { context: `Error fetching entries for account ${accountId}` });
    throw new InternalServerError('Could not retrieve entries.');
  }
};

/**
 * Creates a new entry internally. Not exposed via API.
 * Used by system processes like the Recon Engine.
 * @param entryData - Data for the new entry.
 * @param tx - Optional: Prisma transaction client.
 * @returns The newly created entry object (Domain Model).
 */
const createEntryInternal = async (
  entryData: CreateEntryInternalData,
  tx?: Prisma.TransactionClient
): Promise<Entry> => { // Return Domain Entry
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
    throw new ValidationError('Missing required fields for internal entry creation: account_id, transaction_id, entry_type, amount, currency, status, effective_date.');
  }
  // Validation for enums is implicitly handled by TypeScript types if entryData is correctly typed at call site.
  // However, runtime checks can be useful if data source is less certain.
  if (!Object.values(EntryType).includes(entry_type)) {
    throw new ValidationError(`Invalid entry_type: ${entry_type}`);
  }
  if (!Object.values(PrismaEntryStatusEnum).includes(status)) { // Use aliased Prisma enum
    throw new ValidationError(`Invalid entry status: ${status}`);
  }

  const prismaClient = tx || prisma;

  // Account existence check
  const account = await prismaClient.account.findUnique({ where: { account_id } });
  if (!account) {
    throw new NotFoundError('Account', account_id);
  }
  
  // Transaction existence check (only if not within a transaction that might be creating it)
  // Since transaction_id is mandatory, this check is more relevant.
  if (!tx) { 
    const transaction = await prismaClient.transaction.findUnique({ where: { transaction_id } });
    if (!transaction) {
      throw new NotFoundError('Transaction', transaction_id);
    }
  }

  try {
    // Generate custom entry_id for EXPECTED entries
    const entryData: Prisma.EntryCreateInput = {
      account: { connect: { account_id } },
      transaction: { connect: { transaction_id } },
      entry_type,
      amount: new Prisma.Decimal(amount.toString()), // Ensure amount is Decimal
      currency,
      status,
      effective_date: new Date(effective_date),
      metadata: metadata || Prisma.JsonNull,
      discarded_at: discarded_at ? new Date(discarded_at) : null,
    };

    // If creating an EXPECTED entry, prefix the ID with "expected_"
    if (status === PrismaEntryStatusEnum.EXPECTED) {
      const { customAlphabet } = await import('nanoid');
      const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 21);
      entryData.entry_id = `expected_${nanoid()}`;
    }

    const newEntry = await prismaClient.entry.create({
      data: entryData,
    });
    return newEntry as Entry; // Cast to Domain model
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const prismaError = error as PrismaError; 
    logger.error(prismaError, { context: `Error creating internal entry for account ${account_id}` });
    if (prismaError.name === 'PrismaClientValidationError' || (prismaError.code && prismaError.code.startsWith('P2'))) {
        throw new ValidationError(`Invalid input for internal entry creation. Details: ${prismaError.message.split('\n').slice(-2).join(' ')}`);
    }
    throw new InternalServerError('Could not create internal entry.');
  }
};

export {
  listEntries,
  createEntryInternal,
};
