const express = require('express');
const mainRouter = require('./server/routes'); // Main router from src/server/routes/index.js
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swaggerDef'); // Path to your swagger definition

const app = express();

// Middleware
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Mount main API router
app.use('/api', mainRouter); // All routes will be prefixed with /api

// Serve Swagger UI at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Basic route for root path (optional)
app.get('/', (req, res) => {
    res.send('Smart Ledger Backend is running. API docs at /api-docs');
});

// Centralized error handling middleware (simple example)
// This should be defined AFTER all other app.use() and routes calls
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal Server Error',
            // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined // Optional: show stack in dev
        }
    });
});

module.exports = app;
