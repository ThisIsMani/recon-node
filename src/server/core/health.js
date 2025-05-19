const prisma = require('../../services/prisma'); // Use the new Prisma service

const checkHealth = async () => {
    let dbConnected = false;
    try {
        // Prisma's $queryRawUnsafe is a way to send a simple query.
        // For PostgreSQL, 'SELECT 1' is a common ping.
        await prisma.$queryRawUnsafe('SELECT 1');
        dbConnected = true;
        console.log('Database connection test via Prisma successful.');
    } catch (error) {
        console.error('Database connection test via Prisma failed:', error);
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

module.exports = {
    checkHealth
};
