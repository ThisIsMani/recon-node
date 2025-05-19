const app = require('./app');
const config = require('./config');
// const database = require('./services/database'); // Not strictly needed here unless testing connection at start

const PORT = config.port || 3000;

const server = app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Access it at http://localhost:${PORT}`);
    
    // Optional: Test database connection on server start
    // This is useful for early failure detection if DB is down
    // try {
    //     const isDbConnected = await database.testConnection();
    //     if (!isDbConnected) {
    //         console.warn('Initial database connection test failed. Please check DB settings and connectivity.');
    //     }
    // } catch (error) {
    //     console.error('Error during initial database connection test:', error);
    // }
});

// Graceful shutdown (optional but good practice)
const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
        console.log('HTTP server closed.');
        // Close database pool if it has a close method (pg pool closes idle clients automatically)
        // e.g., if (database.pool && typeof database.pool.end === 'function') {
        //     database.pool.end().then(() => console.log('Database pool closed.'));
        // }
        process.exit(0);
    });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT')); // Ctrl+C
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // kill command

module.exports = server; // Export for potential testing
