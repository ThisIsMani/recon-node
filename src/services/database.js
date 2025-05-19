const { Pool } = require('pg');
const config = require('../config'); // Adjusted path to config

const pool = new Pool(config.database);

pool.on('connect', () => {
    console.log('Connected to the PostgreSQL database.');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1); // Exit the process if the pool encounters a critical error
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    testConnection: async () => {
        try {
            await pool.query('SELECT NOW()');
            console.log('Database connection test successful.');
            return true;
        } catch (error) {
            console.error('Database connection test failed:', error.stack);
            return false;
        }
    },
    // Helper to get a client from the pool for transactions
    getClient: async () => {
        const client = await pool.connect();
        return client;
    }
};
