// src/services/logger.js

/**
 * A simple logger service that wraps console logging and can be disabled for tests.
 */
// src/services/logger.js

/**
 * A simple logger service that wraps console logging.
 * Logging is enabled by default. Set LOGGING_ENABLED=false in .env to disable.
 */
const LOGGING_ENABLED = process.env.LOGGING_ENABLED !== 'false';

const logger = {
  /**
   * Logs a message to the console if logging is enabled.
   * @param {...any} args - Arguments to pass to console.log.
   */
  log: (...args) => {
    if (LOGGING_ENABLED) {
      console.log(...args);
    }
  },

  /**
   * Logs an error message to the console if logging is enabled.
   * @param {...any} args - Arguments to pass to console.error.
   */
  error: (...args) => {
    if (LOGGING_ENABLED) {
      console.error(...args);
    }
  },

  /**
   * Logs a warning message to the console if logging is enabled.
   * @param {...any} args - Arguments to pass to console.warn.
   */
  warn: (...args) => {
    if (LOGGING_ENABLED) {
      console.warn(...args);
    }
  },

  /**
   * Logs an info message (alias for log) to the console if logging is enabled.
   * @param {...any} args - Arguments to pass to console.info (or console.log).
   */
  info: (...args) => {
    if (LOGGING_ENABLED) {
      // console.info is often an alias for console.log
      console.info ? console.info(...args) : console.log(...args);
    }
  },

  /**
   * Logs a debug message to the console if logging is enabled.
   * @param {...any} args - Arguments to pass to console.debug (or console.log).
   */
  debug: (...args) => {
    if (LOGGING_ENABLED) {
      // console.debug might not be available everywhere, fallback to console.log
      console.debug ? console.debug(...args) : console.log(...args);
    }
  },
};

module.exports = logger;
