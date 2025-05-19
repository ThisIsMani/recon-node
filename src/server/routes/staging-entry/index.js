const express = require('express');
const stagingEntryCore = require('../../core/staging-entry');

// mergeParams: true allows us to access :account_id from the parent router (accounts)
const router = express.Router({ mergeParams: true }); 

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
 *             $ref: '#/components/schemas/StagingEntryInput'
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
    const entry = await stagingEntryCore.createStagingEntry(account_id, req.body);
    res.status(201).json(entry);
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
        console.error("Error in POST /staging-entries:", error.message);
    }
    const isBadRequest = error.message.includes('not found') || 
                         error.message.includes('Missing required fields') ||
                         error.message.includes('Invalid input');
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

module.exports = router;
