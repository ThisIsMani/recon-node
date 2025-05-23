import express, { Express, Request, Response, NextFunction } from 'express';
import mainRouter from './server/routes'; // Main router, will resolve to index.js or index.ts
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swaggerDef'; // Path to your swagger definition
import cors from 'cors';
import logger from './services/logger'; // Assuming logger.js is also converted or compatible

const app: Express = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Define CORS options if needed, or use default
const corsOptions = {
  origin: 'http://localhost:5173', // Frontend URL
  credentials: true,
};
app.use(cors(corsOptions));

app.use('/api', mainRouter);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req: Request, res: Response) => {
    res.send('Smart Ledger Backend is running. API docs at /api-docs');
});

// Define a type for your error object if it has a specific structure
interface AppError extends Error {
    status?: number;
}

// Centralized error handling middleware
app.use((err: AppError, req: Request, res: Response, next: NextFunction) => {
    logger.error(err.stack || err.toString()); // Log stack if available, otherwise the error itself
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal Server Error',
            // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined // Optional
        }
    });
});

export default app;
