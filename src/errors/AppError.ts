/**
 * Base class for custom application errors.
 * 
 * @property statusCode - HTTP status code associated with this error
 * @property errorCode - Application-specific error code following ERR_MODULE_TYPE pattern
 * @property isOperational - Whether this is an operational error (expected in normal operation)
 * @property details - Additional contextual information about the error
 * @property cause - Optional underlying error that caused this error
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;
  public readonly cause?: Error;

  constructor(
    message: string,
    statusCode: number,
    errorCode: string,
    isOperational: boolean = true,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message);
    // Set the prototype explicitly to allow instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name; // Set error name to class name
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.details = details;
    this.cause = cause;
    
    // Append cause's stack to this error's stack if available
    if (cause && cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }

    // Capture stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }
  
  /**
   * Creates a new instance of this error with additional details merged with existing details
   * 
   * @param additionalDetails - Additional context information to add to the error
   * @returns A new error instance with the combined details
   */
  public withDetails(additionalDetails: Record<string, unknown>): this {
    const ErrorClass = this.constructor as new (
      message: string,
      statusCode: number,
      errorCode: string,
      isOperational: boolean,
      details?: Record<string, unknown>,
      cause?: Error
    ) => this;
    
    return new ErrorClass(
      this.message,
      this.statusCode,
      this.errorCode,
      this.isOperational,
      { ...(this.details || {}), ...additionalDetails },
      this.cause
    );
  }
}

/**
 * Represents a "Not Found" error (HTTP 404).
 * Use when a requested resource could not be found.
 */
export class NotFoundError extends AppError {
  constructor(entityName: string, identifier?: string | number, details?: Record<string, unknown>, cause?: Error) {
    const message = identifier 
      ? `${entityName} with identifier '${identifier}' not found.`
      : `${entityName} not found.`;
    const errorDetails = identifier 
      ? { entityName, identifier, ...details }
      : { entityName, ...details };
    super(message, 404, 'ERR_NOT_FOUND', true, errorDetails, cause);
    this.name = 'NotFoundError';
  }
}

/**
 * Represents a validation error (HTTP 400).
 * Use for input validation failures, schema validation errors, etc.
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>, cause?: Error) {
    super(message, 400, 'ERR_VALIDATION', true, details, cause);
    this.name = 'ValidationError';
  }
}

/**
 * Represents an authentication/authorization error (HTTP 401/403).
 * Use for authentication failures or insufficient permissions.
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required or insufficient permissions.', details?: Record<string, unknown>, cause?: Error) {
    super(message, 401, 'ERR_UNAUTHORIZED', true, details, cause); // Or 403 if preferred for permissions
    this.name = 'UnauthorizedError';
  }
}

/**
 * Represents a generic internal server error (HTTP 500).
 * Use this for unexpected errors that are not operational.
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'An unexpected internal server error occurred.', details?: Record<string, unknown>, cause?: Error) {
    super(message, 500, 'ERR_INTERNAL_SERVER', false, details, cause); // Typically not operational
    this.name = 'InternalServerError';
  }
}
