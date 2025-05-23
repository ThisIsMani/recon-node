import { ReconEngineError } from './base-error'; // Changed BaseError to ReconEngineError

/**
 * Error thrown when validation of a staging entry fails
 */
export class ValidationError extends ReconEngineError {
  constructor(
    message: string,
    details: Record<string, unknown> = {}, // Changed context to details
    cause?: Error
  ) {
    // Provide default statusCode and errorCode for ValidationError
    super(message, 400, 'ERR_RECON_VALIDATION', true, details, cause);
    // this.name = 'ValidationError'; // AppError constructor sets this.name to this.constructor.name
  }
}
