// Environment variables should be loaded by the application's entry point (e.g., server.js or app.js)
// or by a test setup file (like jest.globalSetup.js), not within the config module itself
// to allow for better testability and control over environment variables during tests.

const config = {
    port: parseInt(process.env.PORT || '3000', 10),
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
