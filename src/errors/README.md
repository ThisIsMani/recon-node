# Error Handling in Smart Ledger

This document explains the standardized error handling approach used throughout the Smart Ledger application.

## Error Hierarchy

Our error system is built around a hierarchy of error classes, with `AppError` as the base class.

```
AppError
│
├── DatabaseError
│   ├── ConnectionError
│   ├── QueryError
│   ├── TransactionError
│   └── EntityNotFoundError
│
├── BusinessLogicError
│   ├── DuplicateResourceError
│   ├── ResourceStateError
│   ├── BusinessRuleViolationError
│   └── BalanceError
│
├── ValidationError
│
├── UnauthorizedError
│
├── ExternalServiceError
│   ├── ServiceUnavailableError
│   ├── ServiceTimeoutError
│   └── ServiceResponseError
│
└── SystemError
    ├── ConfigurationError
    ├── FileSystemError
    └── UnexpectedError
```

Each module also has its own specific error classes that extend these base classes. For example, the Transaction module has `TransactionError`, `TransactionNotFoundError`, etc.

## Importing Errors

You can import errors in two ways:

### Direct Imports

```typescript
import { ValidationError, NotFoundError } from '../../../errors/AppError';
import { DatabaseError } from '../../../errors/DatabaseError';
```

### Using the Namespace

```typescript
import { Errors } from '../../../errors';

// Then use:
throw new Errors.ValidationError('Invalid input');
// or
throw new Errors.Database.QueryError('Query failed');
```

## Using Errors

### Basic Usage

```typescript
throw new ValidationError('Invalid input data');
```

### With Details

```typescript
throw new ValidationError('Invalid input data', {
  field: 'email',
  reason: 'Must be a valid email address'
});
```

### With Cause Chain

```typescript
try {
  // code that might throw
} catch (originalError) {
  throw new DatabaseError(
    'Failed to fetch user data',
    500,
    'ERR_DB_QUERY',
    true,
    { userId: '123' },
    originalError
  );
}
```

### Adding Details to an Existing Error

```typescript
const error = new ValidationError('Invalid input');
const enhancedError = error.withDetails({ attemptNumber: 3 });
throw enhancedError;
```

## Error Response Format

All errors are converted to a standardized API response format:

```json
{
  "error": {
    "code": "ERR_VALIDATION",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Must be a valid email address"
    },
    "requestId": "req-123"
  }
}
```

## Best Practices

1. **Use Specific Error Types**: Always use the most specific error class for your situation
2. **Include Contextual Details**: Add relevant context information in the details object
3. **Preserve Error Chains**: When catching and re-throwing, include the original error as the cause
4. **Consistent Error Codes**: Follow the `ERR_MODULE_SPECIFIC` naming convention
5. **Clear Error Messages**: Write user-friendly, actionable error messages

## HTTP Status Codes

- **400 Bad Request**: Validation errors, invalid input
- **401 Unauthorized**: Authentication failures
- **403 Forbidden**: Authorization failures
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource state conflicts
- **422 Unprocessable Entity**: Business rule violations
- **500 Internal Server Error**: Unexpected system errors
- **502 Bad Gateway**: External service failures
- **503 Service Unavailable**: System temporarily unavailable
- **504 Gateway Timeout**: External service timeout

## Module-Specific Error Examples

### Transaction Module

```typescript
import { TransactionValidationError, TransactionNotFoundError } from './errors';

// Not found error
throw new TransactionNotFoundError('tx_123');

// Validation error
throw new TransactionValidationError('Invalid status', {
  providedStatus: 'INVALID',
  validStatuses: ['PENDING', 'COMPLETED']
});
```

### Database Errors

```typescript
import { ConnectionError, QueryError } from '../../../errors/DatabaseError';

// Connection error
throw new ConnectionError('Database connection timed out', {
  host: 'localhost',
  port: 5432,
  timeout: 30
});

// Query error
throw new QueryError('Query failed', {
  query: 'SELECT * FROM users',
  params: { id: 123 }
});
```