import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

import app from './app'; // Now TS
import config from './config'; // Will be TS
import logger from './services/logger'; // Assuming logger.js is compatible or will be TS
// import database from './services/database'; // Not strictly needed here

import http from 'http'; // Import http module

const portValue: string = (config.port !== undefined ? String(config.port) : '3000');
const PORT: number = parseInt(portValue, 10);

const server: http.Server = app.listen(PORT, async () => {
    logger.log(`Server is running on port ${PORT}`);
    logger.log(`Access it at http://localhost:${PORT}`);
    
    // Optional: Test database connection on server start
    // try {
    //     const isDbConnected = await database.testConnection(); // Assuming database service has this
    //     if (!isDbConnected) {
    //         logger.warn('Initial database connection test failed. Please check DB settings and connectivity.');
    //     }
    // } catch (error) {
    //     const err = error as Error;
    //     logger.error('Error during initial database connection test:', err.message);
    // }
});

const gracefulShutdown = (signal: string) => {
    logger.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
        logger.log('HTTP server closed.');
        // Example: if (prisma) await prisma.$disconnect();
        process.exit(0);
    });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export default server; // Export for potential testing
