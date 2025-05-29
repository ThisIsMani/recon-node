import { SystemError, ConfigurationError, FileSystemError, UnexpectedError } from '../../src/errors/SystemError';

describe('SystemError', () => {
  it('should create error with default values', () => {
    const error = new SystemError('System failure');
    
    expect(error.message).toBe('System failure');
    expect(error.statusCode).toBe(500);
    expect(error.errorCode).toBe('ERR_SYSTEM');
    expect(error.isOperational).toBe(false);
    expect(error.name).toBe('SystemError');
  });

  it('should create error with custom values', () => {
    const cause = new Error('Memory overflow');
    const error = new SystemError(
      'Critical system error',
      503,
      'SYSTEM_CRITICAL',
      false,
      { component: 'MemoryManager', usage: '95%' },
      cause
    );
    
    expect(error.message).toBe('Critical system error');
    expect(error.statusCode).toBe(503);
    expect(error.errorCode).toBe('SYSTEM_CRITICAL');
    expect(error.isOperational).toBe(false);
    expect(error.details).toEqual({
      component: 'MemoryManager',
      usage: '95%'
    });
    expect(error.cause).toBe(cause);
  });

  it('should be instance of Error and AppError', () => {
    const error = new SystemError('Test error');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SystemError);
  });
});

describe('ConfigurationError', () => {
  it('should create error with message only', () => {
    const error = new ConfigurationError('Invalid configuration detected');
    
    expect(error.message).toBe('Invalid configuration detected');
    expect(error.statusCode).toBe(500);
    expect(error.errorCode).toBe('ERR_CONFIGURATION');
    expect(error.isOperational).toBe(false);
    expect(error.details).toEqual({});
  });

  it('should create error with config key', () => {
    const error = new ConfigurationError(
      'Missing required environment variable',
      'DATABASE_URL'
    );
    
    expect(error.details).toEqual({
      configKey: 'DATABASE_URL'
    });
  });

  it('should include additional details and cause', () => {
    const cause = new Error('Environment not loaded');
    const error = new ConfigurationError(
      'Configuration load failed',
      'API_KEYS',
      { environment: 'production', source: 'env' },
      cause
    );
    
    expect(error.details).toEqual({
      configKey: 'API_KEYS',
      environment: 'production',
      source: 'env'
    });
    expect(error.cause).toBe(cause);
  });
});

describe('FileSystemError', () => {
  it('should create error with message only', () => {
    const error = new FileSystemError('File operation failed');
    
    expect(error.message).toBe('File operation failed');
    expect(error.statusCode).toBe(500);
    expect(error.errorCode).toBe('ERR_FILE_SYSTEM');
    expect(error.isOperational).toBe(true);
    expect(error.details).toEqual({});
  });

  it('should create error with path and operation', () => {
    const error = new FileSystemError(
      'Failed to read file',
      '/tmp/data.json',
      'read'
    );
    
    expect(error.details).toEqual({
      path: '/tmp/data.json',
      operation: 'read'
    });
  });

  it('should include additional details', () => {
    const cause = new Error('ENOENT: no such file or directory');
    const error = new FileSystemError(
      'File not found',
      '/var/log/app.log',
      'open',
      { permissions: 'r', mode: 0o644 },
      cause
    );
    
    expect(error.details).toEqual({
      path: '/var/log/app.log',
      operation: 'open',
      permissions: 'r',
      mode: 0o644
    });
    expect(error.cause).toBe(cause);
  });
});

describe('UnexpectedError', () => {
  it('should create error with default message', () => {
    const error = new UnexpectedError();
    
    expect(error.message).toBe('An unexpected system error occurred.');
    expect(error.statusCode).toBe(500);
    expect(error.errorCode).toBe('ERR_UNEXPECTED');
    expect(error.isOperational).toBe(false);
  });

  it('should create error with custom message and details', () => {
    const cause = new Error('Unknown error');
    const error = new UnexpectedError(
      'Something went terribly wrong',
      { timestamp: '2023-01-01T00:00:00Z', userId: 'user123' },
      cause
    );
    
    expect(error.message).toBe('Something went terribly wrong');
    expect(error.details).toEqual({
      timestamp: '2023-01-01T00:00:00Z',
      userId: 'user123'
    });
    expect(error.cause).toBe(cause);
  });

  it('should have stack trace', () => {
    const error = new SystemError('Test error');
    
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('SystemError: Test error');
  });
});