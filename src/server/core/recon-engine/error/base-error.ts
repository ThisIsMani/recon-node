import { AppError } from '../../../../errors/AppError';

/**
 * Base error class for Recon Engine specific errors, extending the global AppError.
 */
export class ReconEngineError extends AppError {
  public readonly cause?: Error; // Optional underlying cause

  constructor(
    message: string,
    statusCode: number,         // Required by AppError
    errorCode: string,          // Required by AppError
    isOperational: boolean = true, // Default for AppError
    details?: Record<string, unknown>, // Was 'context', now 'details' for AppError
    cause?: Error               // Optional underlying cause
  ) {
    super(message, statusCode, errorCode, isOperational, details);
    this.name = this.constructor.name; // Ensure name is of the derived class
    this.cause = cause;

    if (cause && cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
    // Object.setPrototypeOf(this, new.target.prototype); // AppError already handles this
  }

  // The withContext method might need to be re-evaluated or removed
  // if AppError's 'details' are not meant to be extended this way,
  // or if a new instance should be created with all AppError params.
  // For now, let's assume 'details' can be extended.
  public withDetails(additionalDetails: Record<string, unknown>): this {
    const ErrorClass = this.constructor as new (
      message: string,
      statusCode: number,
      errorCode: string,
      isOperational: boolean,
      details?: Record<string, unknown>,
      cause?: Error
    ) => this;
    
    return new ErrorClass(
      this.message,
      this.statusCode,
      this.errorCode,
      this.isOperational,
      { ...(this.details as Record<string, unknown>), ...additionalDetails },
      this.cause
    );
  }
  
  public get fullStack(): string {
    return this.stack || this.message;
  }
}
