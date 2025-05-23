import prisma from '../../../services/prisma';
import { AccountType, EntryType, StagingEntryProcessingMode, StagingEntryStatus as PrismaStagingEntryStatusEnum, StagingEntry as PrismaStagingEntry, Account as PrismaAccount, Prisma } from '@prisma/client'; // Aliased StagingEntryStatus
import { StagingEntry, StagingEntryStatus } from '../../domain_models/staging_entry.types'; // Import Domain Model
import * as processTrackerCore from '../process-tracker';
import logger from '../../../services/logger';
import { AppError, NotFoundError, ValidationError, InternalServerError } from '../../../errors/AppError';
import { findUniqueOrThrow } from '../../../services/databaseHelpers'; // Added import
import csv from 'csv-parser';
import { Readable } from 'stream';

// Interface for data to create a staging entry - can be aligned with CreateStagingEntryRequest or a new Domain Input DTO
export interface CreateStagingEntryInput { // Renamed and can be exported if used by routes directly
    entry_type: EntryType;
    amount: number | Prisma.Decimal; 
    currency: string;
    effective_date: string | Date;
    metadata?: any;
    // discarded_at is usually not set on creation
    processing_mode: StagingEntryProcessingMode;
}

// Interface for query parameters when listing staging entries
interface ListStagingEntriesQueryParams {
    status?: PrismaStagingEntryStatusEnum; // Use aliased Prisma enum
}

// Type for Prisma errors
type PrismaError = Error & {
    code?: string;
    name?: string;
    meta?: {
        target?: string[];
    };
};

// Type for the file object expected by ingestStagingEntriesFromFile
interface MulterFile {
    buffer: Buffer;
    originalname: string;
    // Add other multer file properties if needed, e.g., mimetype, size
}

// Type for individual error objects during CSV ingestion
interface IngestionError {
    row_number: number;
    error_details: string;
    row_data: any;
}

// Type for the result of CSV ingestion
interface IngestionResult {
    message: string;
    successful_ingestions: number;
    failed_ingestions: number;
    errors: IngestionError[];
}


async function createStagingEntry(account_id: string, entryData: CreateStagingEntryInput): Promise<StagingEntry> { // Return Domain StagingEntry
  const { entry_type, amount, currency, effective_date, metadata, processing_mode } = entryData;
  // discarded_at is not typically part of creation payload
  if (!entry_type || amount == null || !currency || !effective_date || !processing_mode) {
    throw new ValidationError('Missing required fields in body: entry_type, amount, currency, effective_date, processing_mode.');
  }
  if (!Object.values(StagingEntryProcessingMode).includes(processing_mode)) {
    throw new ValidationError(`Invalid processing_mode. Must be one of: ${Object.values(StagingEntryProcessingMode).join(', ')}`);
  }
  
  await findUniqueOrThrow<PrismaAccount>(
    Prisma.ModelName.Account, 
    { where: { account_id } },
    'Account',
    account_id
  );

  try {
    const newPrismaStagingEntry = await prisma.stagingEntry.create({
      data: {
        account_id,
        entry_type,
        amount: new Prisma.Decimal(amount.toString()), 
        currency,
        processing_mode,
        effective_date: new Date(effective_date),
        metadata: metadata || Prisma.JsonNull,
        // discarded_at is not set on creation
      },
    });

    try {
      await processTrackerCore.createTask(
        'PROCESS_STAGING_ENTRY',
        { 
          staging_entry_id: newPrismaStagingEntry.staging_entry_id
        }
      );
      if (process.env.NODE_ENV !== 'test') {
        logger.log(`Task created for staging_entry_id: ${newPrismaStagingEntry.staging_entry_id}`);
      }
    } catch (taskError) {
      logger.error(taskError as Error, { context: `Failed to create process tracker task for staging_entry_id ${newPrismaStagingEntry.staging_entry_id}` });
    }

    return newPrismaStagingEntry as StagingEntry; // Cast to Domain model
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const prismaError = error as PrismaError;
    if (process.env.NODE_ENV !== 'test') {
      logger.error(prismaError, { context: 'Error creating staging entry' });
    }
    if (prismaError.name === 'PrismaClientValidationError' || (prismaError.code && prismaError.code.startsWith('P2'))) {
        throw new ValidationError(`Invalid input for staging entry creation. Details: ${prismaError.message.split('\n').slice(-2).join(' ')}`);
    }
    throw new InternalServerError('Could not create staging entry.');
  }
}

async function listStagingEntries(account_id: string, queryParams: ListStagingEntriesQueryParams = {}): Promise<Array<StagingEntry & { account: { account_name: string, merchant_id: string } | null }>> { // Return array of Domain StagingEntry
  const whereClause: Prisma.StagingEntryWhereInput = { account_id };
  if (queryParams.status) {
    whereClause.status = queryParams.status;
  }

  try {
    const prismaStagingEntries = await prisma.stagingEntry.findMany({
      where: whereClause,
      include: {
        account: {
          select: { account_name: true, merchant_id: true }
        }
      }
    });
    return prismaStagingEntries as Array<StagingEntry & { account: { account_name: string, merchant_id: string } | null }>; // Cast to Domain model
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (process.env.NODE_ENV !== 'test') {
      logger.error(error as Error, { context: 'Error listing staging entries' });
    }
    throw new InternalServerError('Could not list staging entries.');
  }
}

async function ingestStagingEntriesFromFile(accountId: string, file: MulterFile, processingMode: StagingEntryProcessingMode): Promise<IngestionResult> {
  const results: Array<{ row_number: number, staging_entry_payload: CreateStagingEntryInput }> = []; // Use CreateStagingEntryInput
  const errors: IngestionError[] = [];
  let successfulIngestions = 0;
  let failedIngestions = 0;
  let rowNumber = 0;

  let account: Pick<PrismaAccount, 'account_type' | 'account_id'>; // Made non-null as findUniqueOrThrow guarantees it
  try {
    account = await findUniqueOrThrow<Pick<PrismaAccount, 'account_type' | 'account_id'>>(
      Prisma.ModelName.Account,
      { 
        where: { account_id: accountId },
        select: { account_type: true, account_id: true }
      },
      'Account',
      accountId
    );
  } catch (dbError) {
    // findUniqueOrThrow will throw NotFoundError if not found.
    // This catch block is for other potential errors during the find operation.
    if (process.env.NODE_ENV !== 'test') {
      logger.error(dbError as Error, { context: `Database error fetching account ${accountId}` });
    }
    // If it's already an AppError (like NotFoundError from the helper), rethrow it.
    if (dbError instanceof AppError) {
      return Promise.reject(dbError);
    }
    return Promise.reject(new InternalServerError(`Error fetching account details for ID ${accountId}.`));
  }

  // The null check for account is no longer needed due to findUniqueOrThrow
  // if (!account) {
  //   return Promise.reject(new NotFoundError('Account', accountId));
  // }
  if (!account.account_type) {
    // This indicates a data integrity issue or setup problem, might be a 500.
    return Promise.reject(new InternalServerError(`Account type not defined for account ID ${accountId}. Please ensure schema and data are correct.`));
  }

  return new Promise((resolve, reject) => {
    const stream = Readable.from(file.buffer.toString('utf8'));

    stream
      .pipe(csv())
      .on('data', (data: any) => {
        rowNumber++;
        const currentErrors: string[] = [];
        
        const requiredFields = ['order_id', 'amount', 'currency', 'transaction_date', 'type'];
        for (const field of requiredFields) {
          if (data[field] == null || String(data[field]).trim() === '') { 
            currentErrors.push(`Missing required field: ${field}`);
          }
        }

        if (data.amount && isNaN(parseFloat(data.amount))) {
          currentErrors.push(`Invalid amount: '${data.amount}' is not a number.`);
        }
        if (data.transaction_date) {
          const date = new Date(data.transaction_date);
          if (isNaN(date.getTime())) {
            currentErrors.push(`Invalid transaction_date: '${data.transaction_date}' is not a valid date.`);
          }
        }
        const upperCaseType = data.type ? String(data.type).toUpperCase() : "";
        if (data.type && !['PAYMENT', 'REFUND', 'DEBIT', 'CREDIT'].includes(upperCaseType)) {
          currentErrors.push(`Invalid type: '${data.type}'. Must be 'Payment', 'Refund', 'Debit', or 'Credit'.`);
        }

        if (currentErrors.length > 0) {
          errors.push({
            row_number: rowNumber,
            error_details: currentErrors.join('; '),
            row_data: data,
          });
          failedIngestions++;
        } else {
          let determinedPrismaEntryType: EntryType | undefined;
          const csvTypeUpperCase = String(data.type).toUpperCase();

          if (csvTypeUpperCase === 'DEBIT') {
            determinedPrismaEntryType = EntryType.DEBIT;
          } else if (csvTypeUpperCase === 'CREDIT') {
            determinedPrismaEntryType = EntryType.CREDIT;
          } else {
            if (account!.account_type === AccountType.DEBIT_NORMAL) {
              if (csvTypeUpperCase === 'PAYMENT') determinedPrismaEntryType = EntryType.DEBIT;
              else if (csvTypeUpperCase === 'REFUND') determinedPrismaEntryType = EntryType.CREDIT;
            } else if (account!.account_type === AccountType.CREDIT_NORMAL) {
              if (csvTypeUpperCase === 'PAYMENT') determinedPrismaEntryType = EntryType.CREDIT;
              else if (csvTypeUpperCase === 'REFUND') determinedPrismaEntryType = EntryType.DEBIT;
            }
          }

          if (!determinedPrismaEntryType) {
            errors.push({
              row_number: rowNumber,
              error_details: `Could not determine EntryType for CSV type '${data.type}' and account type '${account!.account_type}'.`,
              row_data: data,
            });
            failedIngestions++;
          } else {
            const stagingEntryData: CreateStagingEntryInput = { // Use CreateStagingEntryInput
              entry_type: determinedPrismaEntryType,
              amount: parseFloat(data.amount),
              currency: data.currency,
              effective_date: new Date(data.transaction_date),
              metadata: {
                order_id: data.order_id,
                source_file: file.originalname, 
              },
              processing_mode: processingMode,
            };
            results.push({ 
              row_number: rowNumber, 
              staging_entry_payload: stagingEntryData 
            });
          }
        }
      })
      .on('end', async () => {
        for (const item of results) {
          try {
            await createStagingEntry(accountId, item.staging_entry_payload);
            successfulIngestions++;
          } catch (dbError) {
            const typedDbError = dbError as Error;
            if (process.env.NODE_ENV !== 'test') {
              logger.error(typedDbError, { context: `Error creating staging entry for row ${item.row_number}` });
            }
            errors.push({
              row_number: item.row_number,
              error_details: `Failed to create staging entry in database: ${typedDbError.message}`,
              row_data: item.staging_entry_payload,
            });
            failedIngestions++;
          }
        }
        
        if (process.env.NODE_ENV !== 'test') {
            logger.log('CSV processing complete. Staging entries creation attempted.');
        }
        resolve({
          message: "File processing complete.",
          successful_ingestions: successfulIngestions,
          failed_ingestions: failedIngestions,
          errors: errors,
        });
      })
      .on('error', (error: Error) => {
        if (process.env.NODE_ENV !== 'test') {
            logger.error(error, { context: 'Error parsing CSV' });
        }
        reject(new ValidationError('Failed to parse CSV file.', { originalError: error.message }));
      });
  });
}

export {
  createStagingEntry,
  listStagingEntries,
  ingestStagingEntriesFromFile,
};
