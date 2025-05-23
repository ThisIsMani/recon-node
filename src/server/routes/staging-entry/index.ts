import express, { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import multer, { MulterError } from 'multer';
import { StagingEntryProcessingMode, StagingEntryStatus as PrismaStagingEntryStatus, EntryType as PrismaEntryType } from '@prisma/client'; // Added EntryType
import * as stagingEntryCore from '../../core/staging-entry';
import logger from '../../../services/logger';
import { AppError, NotFoundError, ValidationError } from '../../../errors/AppError'; // Import AppError types
import { CreateStagingEntryRequest, StagingEntryResponse } from '../../api_models/staging_entry.types'; // Import new API models

const router: Router = express.Router({ mergeParams: true });

const storage = multer.memoryStorage();
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only CSV files are allowed.') as any, false); // Cast error for cb
  }
};
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

interface StagingEntryParams extends ParamsDictionary {
    account_id: string;
}

interface StagingEntryQuery {
    status?: PrismaStagingEntryStatus;
}

// CreateStagingEntryBody interface is replaced by imported CreateStagingEntryRequest

/** @swagger 
 * tags:
 *   name: StagingEntries
 *   description: Staging Entry management for pre-processing financial movements
 */
// ... (Swagger definitions remain the same - ensure they reference new schema names from staging_entry.types.ts) ...

const createStagingEntryHandler: RequestHandler<StagingEntryParams, any, CreateStagingEntryRequest> = async (req, res, next) => {
  try {
    const { account_id } = req.params;
    // req.body is now typed as CreateStagingEntryRequest
    const { entry_type, amount, currency, effective_date, processing_mode, metadata } = req.body;

    if (!processing_mode || !Object.values(StagingEntryProcessingMode).includes(processing_mode)) {
      res.status(400).json({ error: `Invalid or missing processing_mode. Must be one of: ${Object.values(StagingEntryProcessingMode).join(', ')}` });
      return;
    }
    // Add other basic validations if needed, or rely on core logic
    if (!entry_type || !Object.values(PrismaEntryType).includes(entry_type as PrismaEntryType)) {
        res.status(400).json({ error: `Invalid or missing entry_type. Must be one of: ${Object.values(PrismaEntryType).join(', ')}` });
        return;
    }
    
    // Construct payload for core function, ensuring types match (e.g. amount to Decimal if core expects it)
    // The core function createStagingEntry expects specific types, ensure alignment.
    // For now, assuming core function can handle number for amount and string/Date for effective_date.
    const entryPayload = { 
        entry_type: entry_type as PrismaEntryType, // Cast if necessary
        amount, 
        currency, 
        effective_date, 
        processing_mode, 
        metadata 
    };
    
    const stagingEntryData = await stagingEntryCore.createStagingEntry(account_id, entryPayload as any); // Cast to any if core expects different shape

    // Map Prisma model to API model
    const responseEntry: StagingEntryResponse = {
        staging_entry_id: stagingEntryData.staging_entry_id,
        account_id: stagingEntryData.account_id,
        entry_type: stagingEntryData.entry_type,
        amount: stagingEntryData.amount,
        currency: stagingEntryData.currency,
        status: stagingEntryData.status,
        processing_mode: stagingEntryData.processing_mode,
        effective_date: stagingEntryData.effective_date,
        metadata: stagingEntryData.metadata,
        discarded_at: stagingEntryData.discarded_at,
        created_at: stagingEntryData.created_at,
        updated_at: stagingEntryData.updated_at,
    };
    res.status(201).json(responseEntry);
  } catch (error) {
    const err = error as Error; 
    if (process.env.NODE_ENV !== 'test') {
        // logger.error already handles Error instances correctly
        logger.error(err, { context: `Error in POST /accounts/${req.params.account_id}/staging-entries` });
    }

    if (err instanceof AppError) {
        res.status(err.statusCode).json({ 
            error: err.message, 
            code: err.errorCode, 
            details: err.details 
        });
    } else {
        // Fallback for non-AppError errors
        res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  }
};
router.post('/', createStagingEntryHandler);

const listStagingEntriesHandler: RequestHandler<StagingEntryParams, any, any, StagingEntryQuery> = async (req, res, next) => {
  try {
    const { account_id } = req.params;
    const queryParams = { ...req.query }; // Query params type StagingEntryQuery

    const stagingEntryDataList = await stagingEntryCore.listStagingEntries(account_id, queryParams);
    
    // Map Prisma models to API models
    const responseEntries: StagingEntryResponse[] = stagingEntryDataList.map(sEntryData => ({
        staging_entry_id: sEntryData.staging_entry_id,
        account_id: sEntryData.account_id,
        entry_type: sEntryData.entry_type,
        amount: sEntryData.amount,
        currency: sEntryData.currency,
        status: sEntryData.status,
        processing_mode: sEntryData.processing_mode,
        effective_date: sEntryData.effective_date,
        metadata: sEntryData.metadata,
        discarded_at: sEntryData.discarded_at,
        created_at: sEntryData.created_at,
        updated_at: sEntryData.updated_at,
    }));
    res.status(200).json(responseEntries);
  } catch (error) {
    const err = error as Error;
    if (process.env.NODE_ENV !== 'test') {
        logger.error(err, { context: `Error in GET /accounts/${req.params.account_id}/staging-entries` });
    }
    if (err instanceof AppError) {
        res.status(err.statusCode).json({ 
            error: err.message, 
            code: err.errorCode, 
            details: err.details 
        });
    } else {
        res.status(500).json({ error: 'An unexpected error occurred while listing staging entries.' });
    }
  }
};
router.get('/', listStagingEntriesHandler);

const fileUploadMiddleware: RequestHandler<StagingEntryParams> = (req, res, next) => { // Add StagingEntryParams here
  upload.single('file')(req, res, (err: any) => {
    if (err instanceof MulterError) {
      res.status(400).json({ error: `File upload error: ${err.message}` });
      return;
    } else if (err) {
      if (err.message && err.message.includes('Invalid file type')) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: `File upload error: ${err.message}` });
      return;
    }
    next();
  });
};

const ingestFileHandler: RequestHandler<StagingEntryParams, any, { processing_mode: StagingEntryProcessingMode }> = async (req, res, next) => {
  try {
    const { account_id } = req.params;
    const { processing_mode } = req.body; 

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded.' });
      return;
    }
    if (!processing_mode || !Object.values(StagingEntryProcessingMode).includes(processing_mode)) {
      res.status(400).json({ error: `Invalid or missing processing_mode form field. Must be one of: ${Object.values(StagingEntryProcessingMode).join(', ')}` });
      return;
    }

    const result = await stagingEntryCore.ingestStagingEntriesFromFile(account_id, req.file, processing_mode);
    
    if (result.failed_ingestions > 0 && result.successful_ingestions > 0) {
      res.status(207).json(result);
    } else if (result.failed_ingestions > 0 && result.successful_ingestions === 0) {
      res.status(207).json(result);
    } else {
      res.status(200).json(result);
    }

  } catch (error) {
    const err = error as Error;
    if (process.env.NODE_ENV !== 'test') {
        logger.error(err, { context: `Error in POST /accounts/${req.params.account_id}/staging-entries/files` });
    }

    if (err instanceof AppError) {
        res.status(err.statusCode).json({ 
            error: err.message, 
            code: err.errorCode, 
            details: err.details 
        });
    } else if (err.message && (err.message.includes('Invalid file type') || err.message.includes('File upload error'))) { // Multer errors or custom file type error
        res.status(400).json({ error: err.message });
    }
    else {
        res.status(500).json({ error: 'Could not process file due to an unexpected error.' });
    }
  }
};
router.post('/files', fileUploadMiddleware, ingestFileHandler);

export default router;
