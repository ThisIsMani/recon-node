// Environment variables should be loaded by the application's entry point
// (e.g., server.ts or app.ts) or by a test setup file.
// dotenv.config() should be called in the main entry point of the application.

interface DatabaseConfig {
  user?: string;
  host?: string;
  database?: string;
  password?: string;
  port: number;
  // ssl?: { rejectUnauthorized: boolean } | boolean; // Example for SSL
}

export interface AppConfig { // Added export
  port: number;
  database: DatabaseConfig;
}

const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    // Example for SSL, adjust based on actual needs
    // ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  }
};

export default config;
