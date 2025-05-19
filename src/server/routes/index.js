const express = require('express');
const healthRoutes = require('./health');
const merchantRoutes = require('./merchant'); // Import merchant routes
const accountRoutes = require('./account'); // Import account routes
const reconRulesRoutes = require('./recon-rules');
const stagingEntryRoutes = require('./staging-entry');

const router = express.Router();

// Mount health routes
router.use('/health', healthRoutes);

// Mount merchant routes
router.use('/merchants', merchantRoutes);

// Mount account routes (nested under merchants)
router.use('/merchants/:merchant_id/accounts', accountRoutes);

// Mount recon rules routes
router.use('/recon-rules', reconRulesRoutes);

// Mount staging entries routes (nested under accounts)
router.use('/accounts/:account_id/staging-entries', stagingEntryRoutes);

// Mount other resource routes here in the future
// e.g., const ledgerRoutes = require('./ledger');
// router.use('/ledger', ledgerRoutes);

module.exports = router;
