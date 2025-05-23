import { ReconEngineError } from './base-error'; // Changed BaseError to ReconEngineError

/**
 * Error thrown during the processing of a staging entry
 */
export class ProcessingError extends ReconEngineError {
  constructor(
    message: string,
    details: Record<string, unknown> = {}, // Changed context to details
    cause?: Error
  ) {
    // Provide default statusCode and errorCode for ProcessingError
    // These can be overridden by specific processing errors if needed by creating more derived classes.
    super(message, 500, 'ERR_RECON_PROCESSING', true, details, cause); 
    // this.name = 'ProcessingError'; // AppError constructor sets this.name to this.constructor.name
  }
}
