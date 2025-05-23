import express, { Express, Request, Response, NextFunction } from 'express';
import mainRouter from './server/routes'; // Main router, will resolve to index.js or index.ts
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swaggerDef'; // Path to your swagger definition
import cors from 'cors';
import logger from './services/logger'; // Assuming logger.js is also converted or compatible
import { requestContextMiddleware } from './server/middleware/requestContext';
import { AppError } from './errors/AppError'; // Import the base AppError

const app: Express = express();

// Apply request context middleware first
app.use(requestContextMiddleware);

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

// Centralized error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error(err); // Log the full error object

    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            error: {
                message: err.message,
                code: err.errorCode,
                details: err.details,
                // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined, // Optional
            }
        });
    } else {
        // Handle non-AppError errors (e.g., generic Error, system errors)
        res.status(500).json({
            error: {
                message: 'An unexpected internal server error occurred.',
                code: 'ERR_UNHANDLED',
                // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined, // Optional
            }
        });
    }
});

export default app;
