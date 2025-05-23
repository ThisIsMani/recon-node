import { AppError } from './AppError';

/**
 * Base class for database-related errors.
 * Examples include connection errors, query errors, entity not found errors.
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'ERR_DATABASE',
    isOperational: boolean = true,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, statusCode, errorCode, isOperational, details, cause);
  }
}

/**
 * Error thrown when a database connection cannot be established.
 */
export class ConnectionError extends DatabaseError {
  constructor(
    message: string = 'Failed to connect to the database',
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, 503, 'ERR_DB_CONNECTION', true, details, cause);
  }
}

/**
 * Error thrown when a database query fails.
 */
export class QueryError extends DatabaseError {
  constructor(
    message: string = 'Database query failed',
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, 500, 'ERR_DB_QUERY', true, details, cause);
  }
}

/**
 * Error thrown when a database transaction fails.
 */
export class TransactionError extends DatabaseError {
  constructor(
    message: string = 'Database transaction failed',
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, 500, 'ERR_DB_TRANSACTION', true, details, cause);
  }
}

/**
 * Error thrown when an entity is not found in the database.
 * This is different from the NotFoundError in AppError.ts, which is used for API-level "not found" responses.
 * Use this error for database-specific "not found" situations.
 */
export class EntityNotFoundError extends DatabaseError {
  constructor(
    entityName: string,
    identifier?: string | number,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    const message = identifier
      ? `${entityName} with identifier '${identifier}' not found in database.`
      : `${entityName} not found in database.`;
    
    const errorDetails = identifier
      ? { entityName, identifier, ...details }
      : { entityName, ...details };
    
    super(message, 404, 'ERR_DB_NOT_FOUND', true, errorDetails, cause);
  }
}