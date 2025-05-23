import prisma from '../../services/prisma';
import logger from '../../services/logger';

interface HealthStatus {
    status: string;
    timestamp: string;
    database: {
        connected: boolean;
        status: string;
    };
}

const checkHealth = async (): Promise<HealthStatus> => {
    let dbConnected = false;
    try {
        // Prisma's $queryRawUnsafe is a way to send a simple query.
        // For PostgreSQL, 'SELECT 1' is a common ping.
        await prisma.$queryRawUnsafe('SELECT 1');
        dbConnected = true;
        logger.log('Database connection test via Prisma successful.');
    } catch (error) {
        logger.error('Database connection test via Prisma failed:', error);
        dbConnected = false;
    }

    return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: {
            connected: dbConnected,
            status: dbConnected ? 'connected' : 'disconnected'
        }
    };
};

export {
    checkHealth
};
