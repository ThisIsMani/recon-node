const express = require('express');
const reconRulesCore = require('../../core/recon-rules');

const router = express.Router({ mergeParams: true }); // Enable access to merchant_id from parent router

/**
 * @swagger
 * tags:
 *   name: ReconRules
 *   description: Reconciliation Rule management
 */

/**
 * @swagger
 * /merchants/{merchant_id}/recon-rules:
 *   post:
 *     summary: Create a new reconciliation rule for a merchant
 *     tags: [ReconRules]
 *     parameters:
 *       - in: path
 *         name: merchant_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the merchant
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
 *               account_two_id:
 *                 type: string
 *                 description: ID of the second account in the mapping.
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
    const { merchant_id } = req.params;
    const rule = await reconRulesCore.createReconRule({ merchant_id, ...req.body });
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
 * /merchants/{merchant_id}/recon-rules:
 *   get:
 *     summary: List all reconciliation rules for a merchant
 *     tags: [ReconRules]
 *     parameters:
 *       - in: path
 *         name: merchant_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the merchant
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
    const { merchant_id } = req.params;
    const rules = await reconRulesCore.listReconRules(merchant_id);
    res.status(200).json(rules);
  } catch (error) {
    console.error('Error in GET /recon-rules:', error);
    res.status(500).json({ error: 'Failed to list recon rules.' });
  }
});

/**
 * @swagger
 * /merchants/{merchant_id}/recon-rules/{rule_id}:
 *   delete:
 *     summary: Delete a reconciliation rule for a merchant
 *     tags: [ReconRules]
 *     parameters:
 *       - in: path
 *         name: merchant_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the merchant
 *       - in: path
 *         name: rule_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the reconciliation rule to delete
 *     responses:
 *       200:
 *         description: Recon rule deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReconRule'
 *       404:
 *         description: Recon rule not found or does not belong to the merchant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 */
router.delete('/:rule_id', async (req, res) => {
  const { merchant_id, rule_id } = req.params;
  try {
    const deletedRule = await reconRulesCore.deleteReconRule(merchant_id, rule_id);
    res.status(200).json(deletedRule);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('does not belong')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
