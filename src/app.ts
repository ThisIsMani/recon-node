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
    // Get request ID from context if available
    const requestId = req.context?.requestId || 'unknown';
    
    // Enhanced logging with request context
    logger.error('Request error', {
        error: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        requestId: requestId,
        // Include the cause chain if it's an AppError with a cause
        ...(err instanceof AppError && err.cause ? { cause: err.cause.message } : {})
    });

    if (err instanceof AppError) {
        // For AppError instances, use the defined status code and error information
        res.status(err.statusCode).json({
            error: {
                code: err.errorCode,
                message: err.message,
                details: err.details || undefined,
                requestId: requestId,
                // Include stack trace only in development
                ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
            }
        });
    } else {
        // For non-AppError errors (e.g., generic Error, system errors)
        // Convert to standard response format
        res.status(500).json({
            error: {
                code: 'ERR_INTERNAL_SERVER',
                message: 'An unexpected internal server error occurred.',
                requestId: requestId,
                // Include original error message and stack trace only in development
                ...(process.env.NODE_ENV === 'development' ? { 
                    originalError: err.message,
                    stack: err.stack 
                } : {})
            }
        });
    }
});

export default app;
