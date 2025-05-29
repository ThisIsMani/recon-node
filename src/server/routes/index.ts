import express, { Router } from 'express';
import healthRoutes from './health'; 
import merchantRoutes from './merchant'; 
import accountRoutes from './account'; 
import reconRulesRoutes from './recon-rules'; 
import stagingEntryRoutes from './staging-entry'; 
import entryRoutes from './entry'; 
import transactionRoutes from './transaction';
import { reconEngineRouter } from './recon-engine'; 

const router: Router = express.Router();

router.use('/health', healthRoutes);

router.use('/merchants', merchantRoutes);

// Mount account routes (nested under merchants)
router.use('/merchants/:merchant_id/accounts', accountRoutes);

router.use('/merchants/:merchant_id/recon-rules', reconRulesRoutes);

// Mount staging entries routes (nested under accounts)
router.use('/accounts/:account_id/staging-entries', stagingEntryRoutes);

// Mount entry routes (nested under accounts)
router.use('/accounts/:account_id/entries', entryRoutes);

// Mount transaction routes (nested under merchants)
router.use('/merchants/:merchant_id/transactions', transactionRoutes);

// Mount recon engine routes
router.use('/recon-engine', reconEngineRouter);

// Mount other resource routes here in the future
// e.g., import ledgerRoutes from './ledger';
// router.use('/ledger', ledgerRoutes);

export default router;
