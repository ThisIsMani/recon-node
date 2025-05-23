import { Pool, PoolConfig, QueryResult, PoolClient } from 'pg';
import config from '../config'; // Now TS
import logger from './logger'; // Now TS

const poolConfig: PoolConfig = config.database; // Assuming config.database matches PoolConfig structure

const pool = new Pool(poolConfig);

pool.on('connect', () => {
    logger.log('Connected to the PostgreSQL database via pg Pool.');
});

pool.on('error', (err: Error) => {
    logger.error('Unexpected error on idle client (pg Pool)', err);
    process.exit(-1); 
});

interface DatabaseService {
    query: (text: string, params?: any[]) => Promise<QueryResult<any>>;
    testConnection: () => Promise<boolean>;
    getClient: () => Promise<PoolClient>;
}

const databaseService: DatabaseService = {
    query: (text: string, params?: any[]): Promise<QueryResult<any>> => pool.query(text, params),
    testConnection: async (): Promise<boolean> => {
        try {
            await pool.query('SELECT NOW()');
            logger.log('Database connection test successful (pg Pool).');
            return true;
        } catch (error) {
            const err = error as Error;
            logger.error('Database connection test failed (pg Pool):', err.stack);
            return false;
        }
    },
    getClient: async (): Promise<PoolClient> => {
        const client = await pool.connect();
        return client;
    }
};

export default databaseService;
