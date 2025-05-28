import { Request } from 'express';

// Augment Express Request type
declare module 'express' {
    interface Request {
        context?: {
            requestId?: string;
            [key: string]: any;
        };
    }
}

// This is a workaround to make the file a proper module
export { };
