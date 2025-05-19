// Load environment variables from .env file
require('dotenv').config();

const config = {
    port: process.env.PORT || 3000,
    database: {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        // You can add more pg Pool options here, e.g., max connections, idle timeout
        // ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false, // Example for SSL
    }
};

module.exports = config;
