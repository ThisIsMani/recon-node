const express = require('express');
const reconRulesCore = require('../../core/recon-rules');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: ReconRules
 *   description: Reconciliation Rule management
 */

/**
 * @swagger
 * /recon-rules:
 *   post:
 *     summary: Create a new reconciliation rule
 *     tags: [ReconRules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - account_one_id
 *               - account_two_id
 *             properties:
 *               account_one_id:
 *                 type: string
 *                 description: ID of the first account in the mapping.
 *                 example: "clxmgm62n000008l3g1k0h2j7"
 *               account_two_id:
 *                 type: string
 *                 description: ID of the second account in the mapping.
 *                 example: "clxmgmabc000108l3b2c1d4e5"
 *     responses:
 *       201:
 *         description: Recon rule created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReconRule'
 *       400:
 *         description: Invalid input (e.g., missing fields, accounts not found, duplicate rule)
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  try {
    const rule = await reconRulesCore.createReconRule(req.body);
    res.status(201).json(rule);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('required') || error.message.includes('must be different') || error.message.includes('already exists')) {
      res.status(400).json({ error: error.message });
    } else {
      console.error('Error in POST /recon-rules:', error);
      res.status(500).json({ error: 'Failed to create recon rule.' });
    }
  }
});

/**
 * @swagger
 * /recon-rules:
 *   get:
 *     summary: List all reconciliation rules
 *     tags: [ReconRules]
 *     responses:
 *       200:
 *         description: A list of reconciliation rules
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ReconRuleWithAccounts'
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const rules = await reconRulesCore.listReconRules();
    res.status(200).json(rules);
  } catch (error) {
    console.error('Error in GET /recon-rules:', error);
    res.status(500).json({ error: 'Failed to list recon rules.' });
  }
});

module.exports = router;
