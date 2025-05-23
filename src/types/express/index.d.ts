import { Request } from 'express';

// Augment Express Request type
declare global {
  namespace Express {
    interface Request {
      context?: {
        requestId?: string;
        [key: string]: any;
      };
    }
  }
}