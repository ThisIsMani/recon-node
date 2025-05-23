import { AppError } from './AppError';

/**
 * Base class for errors related to external service interactions.
 * Use this for API calls, third-party services, and external dependencies.
 */
export class ExternalServiceError extends AppError {
  constructor(
    message: string,
    statusCode: number = 502, // Bad Gateway
    errorCode: string = 'ERR_EXTERNAL_SERVICE',
    isOperational: boolean = true,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, statusCode, errorCode, isOperational, details, cause);
  }
}

/**
 * Error thrown when an external service is unavailable.
 */
export class ServiceUnavailableError extends ExternalServiceError {
  constructor(
    serviceName: string,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    const message = `Service '${serviceName}' is currently unavailable.`;
    const errorDetails = {
      serviceName,
      ...details
    };
    
    super(message, 503, 'ERR_SERVICE_UNAVAILABLE', true, errorDetails, cause);
  }
}

/**
 * Error thrown when a request to an external service times out.
 */
export class ServiceTimeoutError extends ExternalServiceError {
  constructor(
    serviceName: string,
    timeoutMs?: number,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    const message = timeoutMs
      ? `Request to service '${serviceName}' timed out after ${timeoutMs}ms.`
      : `Request to service '${serviceName}' timed out.`;
    
    const errorDetails = {
      serviceName,
      ...(timeoutMs && { timeoutMs }),
      ...details
    };
    
    super(message, 504, 'ERR_SERVICE_TIMEOUT', true, errorDetails, cause);
  }
}

/**
 * Error thrown when an external service returns an error response.
 */
export class ServiceResponseError extends ExternalServiceError {
  constructor(
    serviceName: string,
    statusCode?: number,
    errorResponse?: unknown,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    const message = statusCode
      ? `Service '${serviceName}' returned an error response with status ${statusCode}.`
      : `Service '${serviceName}' returned an error response.`;
    
    const errorDetails = {
      serviceName,
      ...(statusCode && { statusCode }),
      ...(errorResponse ? { errorResponse } : {}),
      ...(details || {})
    };
    
    // Use the status code from the external service, or 502 Bad Gateway as default
    const responseStatusCode = statusCode ? 
      (statusCode >= 400 && statusCode < 600 ? statusCode : 502) : 
      502;
    
    super(message, responseStatusCode, 'ERR_SERVICE_RESPONSE', true, errorDetails, cause);
  }
}