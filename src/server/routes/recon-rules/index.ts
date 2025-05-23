import express, { Router, RequestHandler } from 'express';
import * as reconRulesCore from '../../core/recon-rules';
import logger from '../../../services/logger';

const router: Router = express.Router({ mergeParams: true }); // Enable access to merchant_id from parent router

interface CreateReconRuleBody {
    account_one_id: string;
    account_two_id: string;
    // description?: string; // If you add description to core logic
}

interface ReconRuleParams {
    merchant_id: string;
    rule_id: string; // Route params are strings
}

/**
 * @swagger
 * tags:
 *   name: ReconRules
 *   description: Reconciliation Rule management
 */

// ... (Swagger definitions remain the same) ...

const createReconRuleHandler: RequestHandler<{ merchant_id: string }, any, CreateReconRuleBody> = async (req, res, next) => {
  try {
    const { merchant_id } = req.params;
    // Ensure req.body conforms to what createReconRule expects, or transform it.
    // For now, assuming req.body directly matches CreateReconRuleData from core.
    const ruleData = { 
        merchant_id, 
        account_one_id: req.body.account_one_id,
        account_two_id: req.body.account_two_id,
        // description: req.body.description 
    };
    const rule = await reconRulesCore.createReconRule(ruleData);
    res.status(201).json(rule);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('not found') || err.message.includes('required') || err.message.includes('must be different') || err.message.includes('already exists')) {
      res.status(400).json({ error: err.message });
      return;
    }
    logger.error(`Error in POST /merchants/${req.params.merchant_id}/recon-rules:`, err);
    res.status(500).json({ error: 'Failed to create recon rule.' });
  }
};
router.post('/', createReconRuleHandler);

const listReconRulesHandler: RequestHandler<{ merchant_id: string }> = async (req, res, next) => {
  try {
    const { merchant_id } = req.params;
    const rules = await reconRulesCore.listReconRules(merchant_id);
    res.status(200).json(rules);
  } catch (error) {
    const err = error as Error;
    logger.error(`Error in GET /merchants/${req.params.merchant_id}/recon-rules:`, err);
    res.status(500).json({ error: 'Failed to list recon rules.' });
  }
};
router.get('/', listReconRulesHandler);

const deleteReconRuleHandler: RequestHandler<ReconRuleParams> = async (req, res, next) => {
  const { merchant_id, rule_id } = req.params; // rule_id is a string here
  try {
    // Core logic deleteReconRule now expects rule_id as string
    // No need to parse if rule_id is already expected as string by core logic
    // However, if you want to ensure it's a valid CUID format or non-empty, add validation here.
    // For now, directly pass the string rule_id.
    if (!rule_id) { // Basic check
        res.status(400).json({ error: 'Rule ID is required.'});
        return;
    }
    const deletedRule = await reconRulesCore.deleteReconRule(merchant_id, rule_id);
    res.status(200).json(deletedRule);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('not found') || err.message.includes('does not belong')) {
      res.status(404).json({ error: err.message });
      return;
    }
    logger.error(`Error in DELETE /merchants/${merchant_id}/recon-rules/${rule_id}:`, err);
    res.status(500).json({ error: err.message });
  }
};
router.delete('/:rule_id', deleteReconRuleHandler);

export default router;
