// Main error export file for easy imports

// Base error class and common HTTP errors
export * from './AppError';

// Domain-specific error categories
export * from './BusinessLogicError';
export * from './DatabaseError';
export * from './ExternalServiceError';
export * from './SystemError';

// Re-export everything as a namespace for better organization
import * as AppErrorModule from './AppError';
import * as BusinessLogicErrorModule from './BusinessLogicError';
import * as DatabaseErrorModule from './DatabaseError';
import * as ExternalServiceErrorModule from './ExternalServiceError';
import * as SystemErrorModule from './SystemError';

// Namespaced exports
export const Errors = {
  // Base errors
  AppError: AppErrorModule.AppError,
  NotFoundError: AppErrorModule.NotFoundError,
  ValidationError: AppErrorModule.ValidationError,
  UnauthorizedError: AppErrorModule.UnauthorizedError,
  InternalServerError: AppErrorModule.InternalServerError,
  
  // Database errors
  Database: {
    DatabaseError: DatabaseErrorModule.DatabaseError,
    ConnectionError: DatabaseErrorModule.ConnectionError,
    QueryError: DatabaseErrorModule.QueryError,
    TransactionError: DatabaseErrorModule.TransactionError,
    EntityNotFoundError: DatabaseErrorModule.EntityNotFoundError
  },
  
  // Business logic errors
  BusinessLogic: {
    BusinessLogicError: BusinessLogicErrorModule.BusinessLogicError,
    DuplicateResourceError: BusinessLogicErrorModule.DuplicateResourceError,
    ResourceStateError: BusinessLogicErrorModule.ResourceStateError,
    BusinessRuleViolationError: BusinessLogicErrorModule.BusinessRuleViolationError,
    BalanceError: BusinessLogicErrorModule.BalanceError
  },
  
  // External service errors
  ExternalService: {
    ExternalServiceError: ExternalServiceErrorModule.ExternalServiceError,
    ServiceUnavailableError: ExternalServiceErrorModule.ServiceUnavailableError,
    ServiceTimeoutError: ExternalServiceErrorModule.ServiceTimeoutError,
    ServiceResponseError: ExternalServiceErrorModule.ServiceResponseError
  },
  
  // System errors
  System: {
    SystemError: SystemErrorModule.SystemError,
    ConfigurationError: SystemErrorModule.ConfigurationError,
    FileSystemError: SystemErrorModule.FileSystemError,
    UnexpectedError: SystemErrorModule.UnexpectedError
  }
};