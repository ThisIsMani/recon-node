import { BusinessLogicError } from '../../../errors/BusinessLogicError';
import { DatabaseError } from '../../../errors/DatabaseError';
import { ValidationError } from '../../../errors/AppError';

/**
 * Base class for transaction-related errors.
 */
export class TransactionError extends BusinessLogicError {
  constructor(
    message: string,
    statusCode: number = 400,
    errorCode: string = 'ERR_TRANSACTION',
    isOperational: boolean = true,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, statusCode, errorCode, isOperational, details, cause);
  }
}

/**
 * Error thrown when a transaction is not found.
 */
export class TransactionNotFoundError extends DatabaseError {
  constructor(
    transactionId: string, 
    details?: Record<string, unknown>, 
    cause?: Error
  ) {
    super(
      `Transaction with ID '${transactionId}' not found.`,
      404,
      'ERR_TRANSACTION_NOT_FOUND',
      true,
      { transactionId, ...details },
      cause
    );
  }
}

/**
 * Error thrown when transaction creation fails.
 */
export class TransactionCreationError extends TransactionError {
  constructor(
    message: string = 'Failed to create transaction',
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, 500, 'ERR_TRANSACTION_CREATION', true, details, cause);
  }
}

/**
 * Error thrown when transaction update fails.
 */
export class TransactionUpdateError extends TransactionError {
  constructor(
    message: string = 'Failed to update transaction',
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, 500, 'ERR_TRANSACTION_UPDATE', true, details, cause);
  }
}

/**
 * Error thrown when there are balance issues with a transaction.
 * This replaces the existing BalanceError in the transaction module.
 */
export class BalanceError extends TransactionError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, 400, 'ERR_TRANSACTION_BALANCE', true, details, cause);
  }
}

/**
 * Error thrown when validation fails for transaction data.
 */
export class TransactionValidationError extends ValidationError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, { ...details, errorType: 'ERR_TRANSACTION_VALIDATION' }, cause);
  }
}