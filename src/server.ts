import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

import app from './app'; // Now TS
import config from './config'; // Will be TS
import logger from './services/logger'; // Assuming logger.js is compatible or will be TS
import http from 'http'; // Import http module

const portValue: string = (config.port !== undefined ? String(config.port) : '3000');
const PORT: number = parseInt(portValue, 10);

const server: http.Server = app.listen(PORT, async () => {
    logger.log(`Server is running on port ${PORT}`);
    logger.log(`Access it at http://localhost:${PORT}`);
});

const gracefulShutdown = async (signal: string) => {
    logger.log(`\n${signal} received. Shutting down gracefully...`);
    
    server.close(async () => {
        logger.log('HTTP server closed.');
        
        try {
            // Disconnect from Prisma database
            const prisma = (await import('./services/prisma')).default;
            await prisma.$disconnect();
            logger.log('Database connections closed.');
        } catch (error) {
            logger.error('Error closing database connections:', error);
        }
        
        process.exit(0);
    });
};

// Using async functions with process.on requires proper error handling
process.on('SIGINT', () => {
    gracefulShutdown('SIGINT').catch(err => {
        logger.error('Error during SIGINT shutdown:', err);
        process.exit(1);
    });
});

process.on('SIGTERM', () => {
    gracefulShutdown('SIGTERM').catch(err => {
        logger.error('Error during SIGTERM shutdown:', err);
        process.exit(1);
    });
});

export default server; // Export for potential testing
