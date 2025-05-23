/**
 * Base class for custom application errors.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number,
    errorCode: string,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    // Set the prototype explicitly to allow instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name; // Set error name to class name
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.details = details;

    // Capture stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Represents a "Not Found" error (HTTP 404).
 */
export class NotFoundError extends AppError {
  constructor(entityName: string, identifier?: string | number) {
    const message = identifier 
      ? `${entityName} with identifier '${identifier}' not found.`
      : `${entityName} not found.`;
    super(message, 404, 'ERR_NOT_FOUND', true);
    this.name = 'NotFoundError';
  }
}

/**
 * Represents a validation error (HTTP 400).
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'ERR_VALIDATION', true, details);
    this.name = 'ValidationError';
  }
}

/**
 * Represents an authentication/authorization error (HTTP 401/403).
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required or insufficient permissions.') {
    super(message, 401, 'ERR_UNAUTHORIZED', true); // Or 403 if preferred for permissions
    this.name = 'UnauthorizedError';
  }
}

/**
 * Represents a generic internal server error (HTTP 500).
 * Use this for unexpected errors that are not operational.
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'An unexpected internal server error occurred.') {
    super(message, 500, 'ERR_INTERNAL_SERVER', false); // Typically not operational
    this.name = 'InternalServerError';
  }
}
