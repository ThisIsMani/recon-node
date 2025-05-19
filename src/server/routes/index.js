const express = require('express');
const healthRoutes = require('./health');
const merchantRoutes = require('./merchant'); // Import merchant routes

const router = express.Router();

// Mount health routes
router.use('/health', healthRoutes);

// Mount merchant routes
router.use('/merchants', merchantRoutes);

// Mount other resource routes here in the future
// e.g., const ledgerRoutes = require('./ledger');
// router.use('/ledger', ledgerRoutes);

module.exports = router;
