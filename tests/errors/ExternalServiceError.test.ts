import { ExternalServiceError, ServiceUnavailableError, ServiceTimeoutError, ServiceResponseError } from '../../src/errors/ExternalServiceError';

describe('ExternalServiceError', () => {
  it('should create error with default values', () => {
    const error = new ExternalServiceError('Service unavailable');
    
    expect(error.message).toBe('Service unavailable');
    expect(error.statusCode).toBe(502);
    expect(error.errorCode).toBe('ERR_EXTERNAL_SERVICE');
    expect(error.isOperational).toBe(true);
    expect(error.name).toBe('ExternalServiceError');
  });

  it('should create error with custom values', () => {
    const cause = new Error('Network timeout');
    const error = new ExternalServiceError(
      'Payment gateway error',
      502,
      'PAYMENT_GATEWAY_ERROR',
      true,
      { service: 'PaymentAPI', endpoint: '/charge' },
      cause
    );
    
    expect(error.message).toBe('Payment gateway error');
    expect(error.statusCode).toBe(502);
    expect(error.errorCode).toBe('PAYMENT_GATEWAY_ERROR');
    expect(error.isOperational).toBe(true);
    expect(error.details).toEqual({
      service: 'PaymentAPI',
      endpoint: '/charge'
    });
    expect(error.cause).toBe(cause);
  });

  it('should be instance of Error and AppError', () => {
    const error = new ExternalServiceError('Test error');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ExternalServiceError);
  });
});

describe('ServiceUnavailableError', () => {
  it('should create error with service name', () => {
    const error = new ServiceUnavailableError('PaymentGateway');
    
    expect(error.message).toBe("Service 'PaymentGateway' is currently unavailable.");
    expect(error.statusCode).toBe(503);
    expect(error.errorCode).toBe('ERR_SERVICE_UNAVAILABLE');
    expect(error.details).toEqual({
      serviceName: 'PaymentGateway'
    });
  });

  it('should include additional details and cause', () => {
    const cause = new Error('Connection pool exhausted');
    const error = new ServiceUnavailableError(
      'DatabaseService',
      { region: 'us-east-1', retryAfter: 60 },
      cause
    );
    
    expect(error.details).toEqual({
      serviceName: 'DatabaseService',
      region: 'us-east-1',
      retryAfter: 60
    });
    expect(error.cause).toBe(cause);
  });
});

describe('ServiceTimeoutError', () => {
  it('should create error with timeout value', () => {
    const error = new ServiceTimeoutError('APIService', 30000);
    
    expect(error.message).toBe("Request to service 'APIService' timed out after 30000ms.");
    expect(error.statusCode).toBe(504);
    expect(error.errorCode).toBe('ERR_SERVICE_TIMEOUT');
    expect(error.details).toEqual({
      serviceName: 'APIService',
      timeoutMs: 30000
    });
  });

  it('should create error without timeout value', () => {
    const error = new ServiceTimeoutError('SlowService');
    
    expect(error.message).toBe("Request to service 'SlowService' timed out.");
    expect(error.details).toEqual({
      serviceName: 'SlowService'
    });
  });

  it('should include additional details', () => {
    const error = new ServiceTimeoutError(
      'DataProcessor',
      5000,
      { endpoint: '/process', method: 'POST' }
    );
    
    expect(error.details).toEqual({
      serviceName: 'DataProcessor',
      timeoutMs: 5000,
      endpoint: '/process',
      method: 'POST'
    });
  });
});

describe('ServiceResponseError', () => {
  it('should create error with status code', () => {
    const error = new ServiceResponseError('UserService', 404);
    
    expect(error.message).toBe("Service 'UserService' returned an error response with status 404.");
    expect(error.statusCode).toBe(404);
    expect(error.errorCode).toBe('ERR_SERVICE_RESPONSE');
    expect(error.details).toEqual({
      serviceName: 'UserService',
      statusCode: 404
    });
  });

  it('should create error without status code', () => {
    const error = new ServiceResponseError('UnknownService');
    
    expect(error.message).toBe("Service 'UnknownService' returned an error response.");
    expect(error.statusCode).toBe(502);
    expect(error.details).toEqual({
      serviceName: 'UnknownService'
    });
  });

  it('should include error response and additional details', () => {
    const errorResponse = { error: 'Invalid request', code: 'BAD_REQUEST' };
    const error = new ServiceResponseError(
      'ValidationService',
      400,
      errorResponse,
      { requestId: 'req-123' }
    );
    
    expect(error.details).toEqual({
      serviceName: 'ValidationService',
      statusCode: 400,
      errorResponse: errorResponse,
      requestId: 'req-123'
    });
  });

  it('should handle invalid status codes', () => {
    const error = new ServiceResponseError('WeirdService', 999);
    
    expect(error.statusCode).toBe(502); // Should default to Bad Gateway
  });

  it('should use service status code if valid', () => {
    const error = new ServiceResponseError('AuthService', 401);
    
    expect(error.statusCode).toBe(401);
  });
});