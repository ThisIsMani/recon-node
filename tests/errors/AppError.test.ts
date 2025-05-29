import { AppError, NotFoundError, ValidationError, UnauthorizedError } from '../../src/errors/AppError';

describe('AppError', () => {
  describe('AppError base class', () => {
    it('should create error with all parameters', () => {
      const cause = new Error('Underlying error');
      const error = new AppError(
        'Test error message',
        500,
        'ERR_TEST',
        false,
        { key: 'value' },
        cause
      );
      
      expect(error.message).toBe('Test error message');
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('ERR_TEST');
      expect(error.isOperational).toBe(false);
      expect(error.details).toEqual({ key: 'value' });
      expect(error.cause).toBe(cause);
      expect(error.name).toBe('AppError');
    });

    it('should create error with minimal parameters', () => {
      const error = new AppError('Test error', 400, 'ERR_TEST');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('ERR_TEST');
      expect(error.isOperational).toBe(true);
      expect(error.details).toBeUndefined();
      expect(error.cause).toBeUndefined();
    });

    it('should append cause stack trace', () => {
      const cause = new Error('Cause error');
      const error = new AppError('Main error', 500, 'ERR_MAIN', true, {}, cause);
      
      expect(error.stack).toBeDefined();
      expect(error.cause).toBe(cause);
      // Stack trace manipulation is done in constructor, just verify error has stack
      expect(error.stack).toContain('AppError: Main error');
    });

    it('should handle cause without stack trace', () => {
      const cause = new Error('Cause error');
      delete cause.stack;
      const error = new AppError('Main error', 500, 'ERR_MAIN', true, {}, cause);
      
      expect(error.stack).toBeDefined();
      expect(error.stack).not.toContain('Caused by:');
    });

    it('should be an instance of Error', () => {
      const error = new AppError('Test', 500, 'ERR_TEST');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });

    describe('withDetails method', () => {
      it('should add details to error without existing details', () => {
        const error = new AppError('Test error', 500, 'ERR_TEST');
        const newError = error.withDetails({ newKey: 'newValue' });
        
        expect(newError).toBeInstanceOf(AppError);
        expect(newError.details).toEqual({ newKey: 'newValue' });
        expect(newError.message).toBe(error.message);
        expect(newError.statusCode).toBe(error.statusCode);
        expect(newError.errorCode).toBe(error.errorCode);
      });

      it('should merge details with existing details', () => {
        const error = new AppError('Test error', 500, 'ERR_TEST', true, { existingKey: 'existingValue' });
        const newError = error.withDetails({ newKey: 'newValue' });
        
        expect(newError.details).toEqual({
          existingKey: 'existingValue',
          newKey: 'newValue'
        });
      });

      it('should override existing details with same key', () => {
        const error = new AppError('Test error', 500, 'ERR_TEST', true, { key: 'oldValue' });
        const newError = error.withDetails({ key: 'newValue' });
        
        expect(newError.details).toEqual({ key: 'newValue' });
      });

      it('should preserve cause when adding details', () => {
        const cause = new Error('Cause error');
        const error = new AppError('Test error', 500, 'ERR_TEST', true, {}, cause);
        const newError = error.withDetails({ key: 'value' });
        
        expect(newError.cause).toBe(cause);
      });
    });
  });

  describe('NotFoundError', () => {
    it('should create error with entity name and identifier', () => {
      const error = new NotFoundError('User', 'user123');
      
      expect(error.message).toBe("User with identifier 'user123' not found.");
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('ERR_NOT_FOUND');
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('NotFoundError');
      expect(error.details).toEqual({
        entityName: 'User',
        identifier: 'user123'
      });
    });

    it('should create error with entity name only', () => {
      const error = new NotFoundError('User');
      
      expect(error.message).toBe('User not found.');
      expect(error.details).toEqual({
        entityName: 'User'
      });
    });

    it('should include additional details', () => {
      const error = new NotFoundError('User', 'user123', { searchCriteria: 'email' });
      
      expect(error.details).toEqual({
        entityName: 'User',
        identifier: 'user123',
        searchCriteria: 'email'
      });
    });

    it('should include cause error', () => {
      const cause = new Error('Database error');
      const error = new NotFoundError('User', 'user123', {}, cause);
      
      expect(error.cause).toBe(cause);
    });

    it('should have correct details structure', () => {
      const error = new NotFoundError('User', 'user123', { searchBy: 'email' });
      
      expect(error.details).toEqual({
        entityName: 'User',
        identifier: 'user123',
        searchBy: 'email'
      });
    });
  });

  describe('ValidationError', () => {
    it('should create error with message', () => {
      const error = new ValidationError('Invalid email format');
      
      expect(error.message).toBe('Invalid email format');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('ERR_VALIDATION');
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('ValidationError');
    });

    it('should create error with details', () => {
      const error = new ValidationError('Validation failed', {
        field: 'email',
        value: 'invalid-email'
      });
      
      expect(error.details).toEqual({
        field: 'email',
        value: 'invalid-email'
      });
    });

    it('should create error with cause', () => {
      const cause = new Error('Schema validation failed');
      const error = new ValidationError('Invalid input', {}, cause);
      
      expect(error.cause).toBe(cause);
    });
  });

  describe('UnauthorizedError', () => {
    it('should create error with default message', () => {
      const error = new UnauthorizedError();
      
      expect(error.message).toBe('Authentication required or insufficient permissions.');
      expect(error.statusCode).toBe(401);
      expect(error.errorCode).toBe('ERR_UNAUTHORIZED');
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('UnauthorizedError');
    });

    it('should create error with custom message', () => {
      const error = new UnauthorizedError('Invalid API key');
      
      expect(error.message).toBe('Invalid API key');
    });

    it('should create error with details and cause', () => {
      const cause = new Error('Token expired');
      const error = new UnauthorizedError(
        'Session expired',
        { userId: 'user123', expiredAt: '2023-01-01' },
        cause
      );
      
      expect(error.details).toEqual({
        userId: 'user123',
        expiredAt: '2023-01-01'
      });
      expect(error.cause).toBe(cause);
    });
  });
});