import express, { Router, RequestHandler } from 'express';
import * as reconRulesCore from '../../core/recon-rules';
import logger from '../../../services/logger';
import { AppError } from '../../../errors/AppError'; // Import AppError
import { CreateReconRuleRequest, ReconRuleResponse } from '../../api_models/recon_rule.types'; // Import new API models

const router: Router = express.Router({ mergeParams: true }); // Enable access to merchant_id from parent router

// CreateReconRuleBody interface is replaced by imported CreateReconRuleRequest

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

// ... (Swagger definitions remain the same - ensure they reference new schema names from recon_rule.types.ts) ...

const createReconRuleHandler: RequestHandler<{ merchant_id: string }, any, CreateReconRuleRequest> = async (req, res, next) => {
  try {
    const { merchant_id } = req.params; // merchant_id from path is part of CreateReconRuleRequest
    const { account_one_id, account_two_id } = req.body; // Fields from CreateReconRuleRequest
    
    const ruleDataPayload = { 
        merchant_id, 
        account_one_id,
        account_two_id,
    };
    const ruleData = await reconRulesCore.createReconRule(ruleDataPayload);
    
    // Map Prisma model to API model
    const responseRule: ReconRuleResponse = {
        id: ruleData.id,
        merchant_id: ruleData.merchant_id,
        account_one_id: ruleData.account_one_id,
        account_two_id: ruleData.account_two_id,
        created_at: ruleData.created_at,
        updated_at: ruleData.updated_at,
    };
    res.status(201).json(responseRule);
  } catch (error) {
    const err = error as Error;
    logger.error(err, { context: `Error in POST /merchants/${req.params.merchant_id}/recon-rules` });
    if (err instanceof AppError) {
        res.status(err.statusCode).json({ 
            error: err.message, 
            code: err.errorCode, 
            details: err.details 
        });
    } else {
        res.status(500).json({ error: 'Failed to create recon rule.' });
    }
  }
};
router.post('/', createReconRuleHandler);

const listReconRulesHandler: RequestHandler<{ merchant_id: string }> = async (req, res, next) => {
  try {
    const { merchant_id } = req.params;
    const rulesData = await reconRulesCore.listReconRules(merchant_id);
    
    // Map array of Prisma models to array of API models
    const responseRules: ReconRuleResponse[] = rulesData.map(rule => ({
        id: rule.id,
        merchant_id: rule.merchant_id,
        account_one_id: rule.account_one_id,
        account_two_id: rule.account_two_id,
        created_at: rule.created_at,
        updated_at: rule.updated_at,
    }));
    res.status(200).json(responseRules);
  } catch (error) {
    const err = error as Error;
    logger.error(err, { context: `Error in GET /merchants/${req.params.merchant_id}/recon-rules` });
    if (err instanceof AppError) {
        res.status(err.statusCode).json({ 
            error: err.message, 
            code: err.errorCode, 
            details: err.details 
        });
    } else {
        res.status(500).json({ error: 'Failed to list recon rules.' });
    }
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
    const deletedRuleData = await reconRulesCore.deleteReconRule(merchant_id, rule_id);
    
    // Map Prisma model to API model
    const responseRule: ReconRuleResponse = {
        id: deletedRuleData.id,
        merchant_id: deletedRuleData.merchant_id,
        account_one_id: deletedRuleData.account_one_id,
        account_two_id: deletedRuleData.account_two_id,
        created_at: deletedRuleData.created_at,
        updated_at: deletedRuleData.updated_at,
    };
    res.status(200).json(responseRule);
  } catch (error) {
    const err = error as Error;
    logger.error(err, { context: `Error in DELETE /merchants/${merchant_id}/recon-rules/${rule_id}` });
    if (err instanceof AppError) {
        res.status(err.statusCode).json({ 
            error: err.message, 
            code: err.errorCode, 
            details: err.details 
        });
    } else {
        res.status(500).json({ error: 'Failed to delete recon rule.' });
    }
  }
};
router.delete('/:rule_id', deleteReconRuleHandler);

export default router;
