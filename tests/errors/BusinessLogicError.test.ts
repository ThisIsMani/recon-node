import {
  BusinessLogicError,
  DuplicateResourceError,
  ResourceStateError,
  BusinessRuleViolationError,
  BalanceError
} from '../../src/errors/BusinessLogicError';

describe('BusinessLogicError', () => {
  describe('BusinessLogicError', () => {
    it('should create error with default values', () => {
      const error = new BusinessLogicError('Test message');
      
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(422);
      expect(error.errorCode).toBe('ERR_BUSINESS_LOGIC');
      expect(error.isOperational).toBe(true);
      expect(error.details).toBeUndefined();
      expect(error.cause).toBeUndefined();
    });

    it('should create error with custom values', () => {
      const cause = new Error('Underlying error');
      const error = new BusinessLogicError(
        'Custom message',
        400,
        'CUSTOM_CODE',
        false,
        { customField: 'value' },
        cause
      );
      
      expect(error.message).toBe('Custom message');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('CUSTOM_CODE');
      expect(error.isOperational).toBe(false);
      expect(error.details).toEqual({ customField: 'value' });
      expect(error.cause).toBe(cause);
    });
  });

  describe('DuplicateResourceError', () => {
    it('should create error with identifier', () => {
      const error = new DuplicateResourceError('User', 'user123');
      
      expect(error.message).toBe("User with identifier 'user123' already exists.");
      expect(error.statusCode).toBe(409);
      expect(error.errorCode).toBe('ERR_DUPLICATE_RESOURCE');
      expect(error.isOperational).toBe(true);
      expect(error.details).toEqual({
        resourceType: 'User',
        identifier: 'user123'
      });
    });

    it('should create error without identifier', () => {
      const error = new DuplicateResourceError('User');
      
      expect(error.message).toBe('User already exists.');
      expect(error.details).toEqual({
        resourceType: 'User'
      });
    });

    it('should include additional details', () => {
      const error = new DuplicateResourceError(
        'User',
        'user123',
        { email: 'test@example.com' }
      );
      
      expect(error.details).toEqual({
        resourceType: 'User',
        identifier: 'user123',
        email: 'test@example.com'
      });
    });

    it('should include cause error', () => {
      const cause = new Error('DB constraint violation');
      const error = new DuplicateResourceError('User', 'user123', {}, cause);
      
      expect(error.cause).toBe(cause);
    });
  });

  describe('ResourceStateError', () => {
    it('should create error with minimal parameters', () => {
      const error = new ResourceStateError(
        'Resource is in invalid state',
        'Order'
      );
      
      expect(error.message).toBe('Resource is in invalid state');
      expect(error.statusCode).toBe(422);
      expect(error.errorCode).toBe('ERR_RESOURCE_STATE');
      expect(error.isOperational).toBe(true);
      expect(error.details).toEqual({
        resourceType: 'Order'
      });
    });

    it('should create error with all state parameters', () => {
      const error = new ResourceStateError(
        'Cannot cancel order',
        'Order',
        'SHIPPED',
        'PENDING'
      );
      
      expect(error.details).toEqual({
        resourceType: 'Order',
        currentState: 'SHIPPED',
        requiredState: 'PENDING'
      });
    });

    it('should include additional details and cause', () => {
      const cause = new Error('State transition error');
      const error = new ResourceStateError(
        'Invalid state transition',
        'Order',
        'PENDING',
        'CONFIRMED',
        { orderId: '12345' },
        cause
      );
      
      expect(error.details).toEqual({
        resourceType: 'Order',
        currentState: 'PENDING',
        requiredState: 'CONFIRMED',
        orderId: '12345'
      });
      expect(error.cause).toBe(cause);
    });
  });

  describe('BusinessRuleViolationError', () => {
    it('should create error without rule name', () => {
      const error = new BusinessRuleViolationError('Business rule violated');
      
      expect(error.message).toBe('Business rule violated');
      expect(error.statusCode).toBe(422);
      expect(error.errorCode).toBe('ERR_BUSINESS_RULE_VIOLATION');
      expect(error.isOperational).toBe(true);
      expect(error.details).toEqual({});
    });

    it('should create error with rule name', () => {
      const error = new BusinessRuleViolationError(
        'Minimum order amount not met',
        'MIN_ORDER_AMOUNT'
      );
      
      expect(error.details).toEqual({
        ruleName: 'MIN_ORDER_AMOUNT'
      });
    });

    it('should include additional details and cause', () => {
      const cause = new Error('Validation failed');
      const error = new BusinessRuleViolationError(
        'Invalid operation',
        'DAILY_LIMIT',
        { currentAmount: 100, limit: 50 },
        cause
      );
      
      expect(error.details).toEqual({
        ruleName: 'DAILY_LIMIT',
        currentAmount: 100,
        limit: 50
      });
      expect(error.cause).toBe(cause);
    });
  });

  describe('BalanceError', () => {
    it('should create error with message only', () => {
      const error = new BalanceError('Insufficient balance');
      
      expect(error.message).toBe('Insufficient balance');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('ERR_BALANCE');
      expect(error.isOperational).toBe(true);
      expect(error.details).toBeUndefined();
    });

    it('should create error with details', () => {
      const error = new BalanceError(
        'Balance mismatch',
        { expected: 100, actual: 90 }
      );
      
      expect(error.details).toEqual({
        expected: 100,
        actual: 90
      });
    });

    it('should create error with cause', () => {
      const cause = new Error('Calculation error');
      const error = new BalanceError('Balance error', { amount: 100 }, cause);
      
      expect(error.details).toEqual({ amount: 100 });
      expect(error.cause).toBe(cause);
    });
  });
});