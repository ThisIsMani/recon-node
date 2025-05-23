import { AppError } from './AppError';

/**
 * Base class for business logic related errors.
 * These are errors that occur when business rules or domain constraints are violated.
 */
export class BusinessLogicError extends AppError {
  constructor(
    message: string,
    statusCode: number = 422, // Unprocessable Entity
    errorCode: string = 'ERR_BUSINESS_LOGIC',
    isOperational: boolean = true,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, statusCode, errorCode, isOperational, details, cause);
  }
}

/**
 * Error thrown when an attempt is made to create a duplicate resource.
 */
export class DuplicateResourceError extends BusinessLogicError {
  constructor(
    resourceType: string,
    identifier?: string | number,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    const message = identifier
      ? `${resourceType} with identifier '${identifier}' already exists.`
      : `${resourceType} already exists.`;
    
    const errorDetails = identifier
      ? { resourceType, identifier, ...details }
      : { resourceType, ...details };
    
    super(message, 409, 'ERR_DUPLICATE_RESOURCE', true, errorDetails, cause);
  }
}

/**
 * Error thrown when a resource is in an invalid state for the requested operation.
 */
export class ResourceStateError extends BusinessLogicError {
  constructor(
    message: string,
    resourceType: string,
    currentState?: string,
    requiredState?: string,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    const errorDetails = {
      resourceType,
      ...(currentState && { currentState }),
      ...(requiredState && { requiredState }),
      ...details
    };
    
    super(message, 422, 'ERR_RESOURCE_STATE', true, errorDetails, cause);
  }
}

/**
 * Error thrown when a business rule or constraint is violated.
 */
export class BusinessRuleViolationError extends BusinessLogicError {
  constructor(
    message: string,
    ruleName?: string,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    const errorDetails = {
      ...(ruleName && { ruleName }),
      ...details
    };
    
    super(message, 422, 'ERR_BUSINESS_RULE_VIOLATION', true, errorDetails, cause);
  }
}

/**
 * Error thrown when there are balance-related issues.
 * This replaces the existing BalanceError in the transaction module.
 */
export class BalanceError extends BusinessLogicError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, 400, 'ERR_BALANCE', true, details, cause);
  }
}