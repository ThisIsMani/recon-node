import express, { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import multer, { MulterError } from 'multer';
import { StagingEntryProcessingMode, StagingEntryStatus as PrismaStagingEntryStatus } from '@prisma/client';
import * as stagingEntryCore from '../../core/staging-entry';
import logger from '../../../services/logger';

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

interface CreateStagingEntryBody {
    entry_type: string; // Will be validated by core logic against EntryType enum
    amount: number;
    currency: string;
    effective_date: string;
    metadata?: any;
    discarded_at?: string;
    processing_mode: StagingEntryProcessingMode;
}

/** @swagger 
 * tags:
 *   name: StagingEntries
 *   description: Staging Entry management for pre-processing financial movements
 */
// ... (Swagger definitions remain the same) ...

const createStagingEntryHandler: RequestHandler<StagingEntryParams, any, CreateStagingEntryBody> = async (req, res, next) => {
  try {
    const { account_id } = req.params;
    const { processing_mode, ...entryData } = req.body;

    if (!processing_mode || !Object.values(StagingEntryProcessingMode).includes(processing_mode)) {
      res.status(400).json({ error: `Invalid or missing processing_mode. Must be one of: ${Object.values(StagingEntryProcessingMode).join(', ')}` });
      return;
    }

    // Type assertion for entryData to match core logic expectations
    const typedEntryData = entryData as any; // Let core logic handle detailed validation for now
    const entryPayload = { ...typedEntryData, processing_mode };
    
    const entry = await stagingEntryCore.createStagingEntry(account_id, entryPayload);
    res.status(201).json(entry);
  } catch (error) {
    const err = error as Error;
    if (process.env.NODE_ENV !== 'test') {
        logger.error(`Error in POST /accounts/${req.params.account_id}/staging-entries:`, err.message);
    }
    const isBadRequest = err.message.includes('not found') || 
                         err.message.includes('Missing required fields') ||
                         err.message.includes('Invalid input') ||
                         err.message.includes('processing_mode');
    res.status(isBadRequest ? 400 : 500).json({ error: err.message });
  }
};
router.post('/', createStagingEntryHandler);

const listStagingEntriesHandler: RequestHandler<StagingEntryParams, any, any, StagingEntryQuery> = async (req, res, next) => {
  try {
    const { account_id } = req.params;
    const queryParams = { ...req.query };

    const entries = await stagingEntryCore.listStagingEntries(account_id, queryParams);
    res.status(200).json(entries);
  } catch (error) {
    const err = error as Error;
    if (process.env.NODE_ENV !== 'test') {
        logger.error(`Error in GET /accounts/${req.params.account_id}/staging-entries:`, err.message);
    }
    res.status(500).json({ error: err.message });
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
        logger.error(`Error in POST /accounts/${req.params.account_id}/staging-entries/files:`, err.message, err.stack);
    }
    if (err.message.includes('Account with ID') && err.message.includes('not found')) {
        res.status(404).json({ error: err.message });
        return;
    }
    if (err.message.includes('Invalid file type')) { // This might be caught by multer middleware already
        res.status(400).json({ error: err.message });
        return;
    }
    res.status(500).json({ error: err.message || 'Could not process file.' });
  }
};
router.post('/files', fileUploadMiddleware, ingestFileHandler);

export default router;
