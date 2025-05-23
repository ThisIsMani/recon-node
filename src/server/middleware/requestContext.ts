import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requestContextStorage } from '../../services/logger'; // Adjust path as needed

/**
 * Middleware to set up a request context with a unique request ID.
 * This uses AsyncLocalStorage to make the requestId available throughout
 * the asynchronous operations of a single request.
 */
export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  let incomingRequestId = req.headers['x-request-id'];
  if (Array.isArray(incomingRequestId)) {
    incomingRequestId = incomingRequestId[0];
  }
  const requestId = incomingRequestId || uuidv4();

  // Attach to request object for direct access in middleware and controllers
  req.context = { requestId };

  requestContextStorage.run({ requestId }, () => {
    // Set X-Request-ID header for client response
    res.setHeader('X-Request-ID', requestId);
    next();
  });
};
