/**
 * A simple logger service that wraps console logging.
 * Logging is enabled by default. Set LOGGING_ENABLED=false in .env to disable.
 */
const LOGGING_ENABLED: boolean = process.env.LOGGING_ENABLED !== 'false';

interface Logger {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

const logger: Logger = {
  /**
   * Logs a message to the console if logging is enabled.
   * @param {...any} args - Arguments to pass to console.log.
   */
  log: (...args: any[]): void => {
    if (LOGGING_ENABLED) {
      console.log(...args);
    }
  },

  /**
   * Logs an error message to the console if logging is enabled.
   * @param {...any} args - Arguments to pass to console.error.
   */
  error: (...args: any[]): void => {
    if (LOGGING_ENABLED) {
      console.error(...args);
    }
  },

  /**
   * Logs a warning message to the console if logging is enabled.
   * @param {...any} args - Arguments to pass to console.warn.
   */
  warn: (...args: any[]): void => {
    if (LOGGING_ENABLED) {
      console.warn(...args);
    }
  },

  /**
   * Logs an info message (alias for log) to the console if logging is enabled.
   * @param {...any} args - Arguments to pass to console.info (or console.log).
   */
  info: (...args: any[]): void => {
    if (LOGGING_ENABLED) {
      // console.info is often an alias for console.log
      console.info ? console.info(...args) : console.log(...args);
    }
  },

  /**
   * Logs a debug message to the console if logging is enabled.
   * @param {...any} args - Arguments to pass to console.debug (or console.log).
   */
  debug: (...args: any[]): void => {
    if (LOGGING_ENABLED) {
      // console.debug might not be available everywhere, fallback to console.log
      console.debug ? console.debug(...args) : console.log(...args);
    }
  },
};

export default logger;
