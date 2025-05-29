import { DatabaseError, ConnectionError, QueryError, TransactionError, EntityNotFoundError } from '../../src/errors/DatabaseError';

describe('DatabaseError', () => {
  it('should create error with default values', () => {
    const error = new DatabaseError('Database connection failed');
    
    expect(error.message).toBe('Database connection failed');
    expect(error.statusCode).toBe(500);
    expect(error.errorCode).toBe('ERR_DATABASE');
    expect(error.isOperational).toBe(true);
    expect(error.name).toBe('DatabaseError');
  });

  it('should create error with custom values', () => {
    const cause = new Error('Connection timeout');
    const error = new DatabaseError(
      'Query timeout',
      502,
      'DB_TIMEOUT',
      true,
      { query: 'SELECT * FROM users', timeout: 30000 },
      cause
    );
    
    expect(error.message).toBe('Query timeout');
    expect(error.statusCode).toBe(502);
    expect(error.errorCode).toBe('DB_TIMEOUT');
    expect(error.isOperational).toBe(true);
    expect(error.details).toEqual({
      query: 'SELECT * FROM users',
      timeout: 30000
    });
    expect(error.cause).toBe(cause);
  });

  it('should be instance of Error and AppError', () => {
    const error = new DatabaseError('Test error');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DatabaseError);
  });
});

describe('ConnectionError', () => {
  it('should create error with default message', () => {
    const error = new ConnectionError();
    
    expect(error.message).toBe('Failed to connect to the database');
    expect(error.statusCode).toBe(503);
    expect(error.errorCode).toBe('ERR_DB_CONNECTION');
    expect(error.isOperational).toBe(true);
  });

  it('should create error with custom message and details', () => {
    const cause = new Error('ECONNREFUSED');
    const error = new ConnectionError(
      'Cannot connect to primary database',
      { host: 'localhost', port: 5432 },
      cause
    );
    
    expect(error.message).toBe('Cannot connect to primary database');
    expect(error.details).toEqual({ host: 'localhost', port: 5432 });
    expect(error.cause).toBe(cause);
  });
});

describe('QueryError', () => {
  it('should create error with default message', () => {
    const error = new QueryError();
    
    expect(error.message).toBe('Database query failed');
    expect(error.statusCode).toBe(500);
    expect(error.errorCode).toBe('ERR_DB_QUERY');
  });

  it('should create error with query details', () => {
    const cause = new Error('Syntax error near FROM');
    const error = new QueryError(
      'Invalid SQL syntax',
      { query: 'SELECT * FORM users', line: 1, position: 10 },
      cause
    );
    
    expect(error.message).toBe('Invalid SQL syntax');
    expect(error.details).toEqual({
      query: 'SELECT * FORM users',
      line: 1,
      position: 10
    });
    expect(error.cause).toBe(cause);
  });
});

describe('TransactionError', () => {
  it('should create error with default message', () => {
    const error = new TransactionError();
    
    expect(error.message).toBe('Database transaction failed');
    expect(error.statusCode).toBe(500);
    expect(error.errorCode).toBe('ERR_DB_TRANSACTION');
  });

  it('should create error with transaction details', () => {
    const cause = new Error('Deadlock detected');
    const error = new TransactionError(
      'Transaction rolled back due to deadlock',
      { transactionId: 'tx-123', duration: 5000 },
      cause
    );
    
    expect(error.message).toBe('Transaction rolled back due to deadlock');
    expect(error.details).toEqual({
      transactionId: 'tx-123',
      duration: 5000
    });
    expect(error.cause).toBe(cause);
  });
});

describe('EntityNotFoundError', () => {
  it('should create error with entity name and identifier', () => {
    const error = new EntityNotFoundError('User', 'user-123');
    
    expect(error.message).toBe("User with identifier 'user-123' not found in database.");
    expect(error.statusCode).toBe(404);
    expect(error.errorCode).toBe('ERR_DB_NOT_FOUND');
    expect(error.details).toEqual({
      entityName: 'User',
      identifier: 'user-123'
    });
  });

  it('should create error without identifier', () => {
    const error = new EntityNotFoundError('Configuration');
    
    expect(error.message).toBe('Configuration not found in database.');
    expect(error.details).toEqual({
      entityName: 'Configuration'
    });
  });

  it('should include additional details and cause', () => {
    const cause = new Error('Query returned empty result');
    const error = new EntityNotFoundError(
      'Order',
      'ORD-123',
      { userId: 'user-456', timestamp: '2023-01-01' },
      cause
    );
    
    expect(error.details).toEqual({
      entityName: 'Order',
      identifier: 'ORD-123',
      userId: 'user-456',
      timestamp: '2023-01-01'
    });
    expect(error.cause).toBe(cause);
  });
});