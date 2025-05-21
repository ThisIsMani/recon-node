const express = require('express');
const multer = require('multer'); // Import multer
const { StagingEntryProcessingMode } = require('@prisma/client'); // Import the enum
const stagingEntryCore = require('../../core/staging-entry');

// mergeParams: true allows us to access :account_id from the parent router (accounts)
const router = express.Router({ mergeParams: true });

// Configure multer for CSV file uploads
const storage = multer.memoryStorage(); // Store files in memory
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only CSV files are allowed.'), false);
  }
};
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/** @swagger 
 * tags:
 *   name: StagingEntries
 *   description: Staging Entry management for pre-processing financial movements
 */

/** @swagger
 * /accounts/{account_id}/staging-entries:
 *   post:
 *     summary: Create a new staging entry for a specific account
 *     tags: [StagingEntries]
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: ID of the account to associate the staging entry with
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/StagingEntryInput'
 *               - type: object
 *                 required:
 *                   - processing_mode
 *                 properties:
 *                   processing_mode:
 *                     $ref: '#/components/schemas/StagingEntryProcessingModeEnum'
 *     responses:
 *       201:
 *         description: Staging entry created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StagingEntry'
 *       400:
 *         description: Invalid input (e.g., missing fields, account not found, invalid enum value)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', async (req, res) => {
  try {
    const { account_id } = req.params;
    const { processing_mode, ...entryData } = req.body;

    if (!processing_mode || !Object.values(StagingEntryProcessingMode).includes(processing_mode)) {
      return res.status(400).json({ error: `Invalid or missing processing_mode. Must be one of: ${Object.values(StagingEntryProcessingMode).join(', ')}` });
    }

    const entryPayload = { ...entryData, processing_mode };
    const entry = await stagingEntryCore.createStagingEntry(account_id, entryPayload);
    res.status(201).json(entry);
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
        console.error("Error in POST /staging-entries:", error.message);
    }
    const isBadRequest = error.message.includes('not found') || 
                         error.message.includes('Missing required fields') ||
                         error.message.includes('Invalid input') ||
                         error.message.includes('processing_mode');
    res.status(isBadRequest ? 400 : 500).json({ error: error.message });
  }
});

/** @swagger
 * /accounts/{account_id}/staging-entries:
 *   get:
 *     summary: List all staging entries for a specific account
 *     tags: [StagingEntries]
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: ID of the account to list staging entries for
 *         schema:
 *           type: string
 *       - name: status
 *         in: query
 *         required: false
 *         schema:
 *           $ref: '#/components/schemas/StagingEntryStatusEnum'
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: A list of staging entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StagingEntry'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', async (req, res) => {
  try {
    const { account_id } = req.params;
    // Pass query parameters (like status) to the core logic
    const queryParams = { ...req.query };

    const entries = await stagingEntryCore.listStagingEntries(account_id, queryParams);
    res.status(200).json(entries);
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
        console.error("Error in GET /staging-entries:", error.message);
    }
    res.status(500).json({ error: error.message });
  }
});

/** @swagger
 * /accounts/{account_id}/staging-entries/files:
 *   post:
 *     summary: Ingest staging entries from a CSV file for a specific account
 *     tags: [StagingEntries]
 *     parameters:
 *       - name: account_id
 *         in: path
 *         required: true
 *         description: ID of the account to associate the staging entries with
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - processing_mode
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file containing staging entries.
 *               processing_mode:
 *                 $ref: '#/components/schemas/StagingEntryProcessingModeEnum'
 *                 description: The processing mode to apply to all entries in this file.
 *     responses:
 *       200:
 *         description: File processed, summary of ingestions and failures.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 successful_ingestions:
 *                   type: integer
 *                 failed_ingestions:
 *                   type: integer
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       row_number:
 *                         type: integer
 *                       error_details:
 *                         type: string
 *                       row_data:
 *                         type: object
 *       207:
 *         description: File processed with some errors (Multi-Status).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 successful_ingestions:
 *                   type: integer
 *                 failed_ingestions:
 *                   type: integer
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       row_number:
 *                         type: integer
 *                       error_details:
 *                         type: string
 *                       row_data:
 *                         type: object
 *       400:
 *         description: Invalid input (e.g., no file, invalid file type, invalid account_id)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/files', (req, res, next) => { // Add next for custom error handling
  upload.single('file')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading.
      return res.status(400).json({ error: `File upload error: ${err.message}` });
    } else if (err) {
      // An unknown error occurred when uploading (e.g., our custom fileFilter error).
      if (err.message && err.message.includes('Invalid file type')) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: `File upload error: ${err.message}` });
    }
    // Everything went fine with file upload, proceed to route handler logic
    next();
  });
}, async (req, res) => { // Actual route handler
  try {
    const { account_id } = req.params;
    const { processing_mode } = req.body; // processing_mode from form field

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    if (!processing_mode || !Object.values(StagingEntryProcessingMode).includes(processing_mode)) {
      return res.status(400).json({ error: `Invalid or missing processing_mode form field. Must be one of: ${Object.values(StagingEntryProcessingMode).join(', ')}` });
    }

    const result = await stagingEntryCore.ingestStagingEntriesFromFile(account_id, req.file, processing_mode);
    
    // Determine status code based on results
    if (result.failed_ingestions > 0 && result.successful_ingestions > 0) {
      res.status(207).json(result); // Multi-Status
    } else if (result.failed_ingestions > 0 && result.successful_ingestions === 0) {
      // If all failed, it could be a 400 if it's due to file-wide issues,
      // or still 207 if individual rows had issues. For now, let's use 207.
      // This might need refinement based on the type of errors.
      res.status(207).json(result);
    } else {
      res.status(200).json(result); // All successful
    }

  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
        console.error("Error in POST /files:", error.message, error.stack);
    }
    if (error.message.includes('Account with ID') && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Invalid file type')) {
        return res.status(400).json({ error: error.message });
    }
    // General error
    res.status(500).json({ error: error.message || 'Could not process file.' });
  }
});

module.exports = router;
