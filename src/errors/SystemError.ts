import { AppError } from './AppError';

/**
 * Base class for system-level errors.
 * These are typically non-operational errors related to the application or its environment.
 */
export class SystemError extends AppError {
  constructor(
    message: string,
    statusCode: number = 500, // Internal Server Error
    errorCode: string = 'ERR_SYSTEM',
    isOperational: boolean = false, // System errors are typically not operational
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, statusCode, errorCode, isOperational, details, cause);
  }
}

/**
 * Error thrown when there's an issue with application configuration.
 */
export class ConfigurationError extends SystemError {
  constructor(
    message: string,
    configKey?: string,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    const errorDetails = {
      ...(configKey && { configKey }),
      ...details
    };
    
    super(message, 500, 'ERR_CONFIGURATION', false, errorDetails, cause);
  }
}

/**
 * Error thrown when there's an issue with file system operations.
 */
export class FileSystemError extends SystemError {
  constructor(
    message: string,
    path?: string,
    operation?: string,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    const errorDetails = {
      ...(path && { path }),
      ...(operation && { operation }),
      ...details
    };
    
    super(message, 500, 'ERR_FILE_SYSTEM', true, errorDetails, cause);
  }
}

/**
 * Error thrown for unexpected errors that don't fit other categories.
 * This is similar to InternalServerError but specifically for system-level unexpected errors.
 */
export class UnexpectedError extends SystemError {
  constructor(
    message: string = 'An unexpected system error occurred.',
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, 500, 'ERR_UNEXPECTED', false, details, cause);
  }
}