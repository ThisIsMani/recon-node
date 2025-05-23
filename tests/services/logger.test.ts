// tests/services/logger.test.ts

// Import the logger, it will be the default export
import loggerModule from '../../src/services/logger'; 

// Define a type for the logger if not already globally available or imported from source
interface Logger {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

describe('Logger Service', () => {
  let originalLogEnv: string | undefined;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;
  let loggerUnderTest: Logger; // Variable to hold the reloaded logger

  beforeEach(() => {
    originalLogEnv = process.env.LOGGING_ENABLED;
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.LOGGING_ENABLED = originalLogEnv;
    jest.restoreAllMocks();
    jest.resetModules(); // Important to reset modules to re-evaluate logger with new env var
  });

  const setupLoggerForTest = (envValue?: string) => {
    if (envValue === undefined) {
      delete process.env.LOGGING_ENABLED;
    } else {
      process.env.LOGGING_ENABLED = envValue;
    }
    jest.resetModules(); // Reset modules to re-import logger with new env
    // When using ES modules and jest.resetModules, dynamic import or re-require might behave differently.
    // For simplicity, we'll assume the logger module re-evaluates process.env.LOGGING_ENABLED upon import.
    // In a real TS/ESM setup, you might need a more robust way to test env var effects,
    // or directly mock the LOGGING_ENABLED const within the logger module if it's exported.
    // For this conversion, we'll rely on jest.resetModules and re-importing.
    loggerUnderTest = require('../../src/services/logger').default as Logger;
  };


  describe('When LOGGING_ENABLED is true or undefined', () => {
    const testCases = [
      { name: 'LOGGING_ENABLED is "true"', value: 'true' },
      { name: 'LOGGING_ENABLED is undefined', value: undefined },
      { name: 'LOGGING_ENABLED is empty string (evaluates to true for LOGGING_ENABLED !== "false")', value: '' },
    ];

    testCases.forEach(tc => {
      describe(tc.name, () => {
        beforeEach(() => {
          setupLoggerForTest(tc.value);
        });
        
        test('logger.log should call console.log', () => {
          loggerUnderTest.log('test log');
          expect(consoleLogSpy).toHaveBeenCalledWith('test log');
        });

        test('logger.error should call console.error', () => {
          loggerUnderTest.error('test error');
          expect(consoleErrorSpy).toHaveBeenCalledWith('test error');
        });

        test('logger.warn should call console.warn', () => {
          loggerUnderTest.warn('test warn');
          expect(consoleWarnSpy).toHaveBeenCalledWith('test warn');
        });

        test('logger.info should call console.info or console.log', () => {
          loggerUnderTest.info('test info');
          // console.info might not exist in all Node test environments
          if (typeof console.info === 'function') {
            expect(consoleInfoSpy).toHaveBeenCalledWith('test info');
          } else {
            expect(consoleLogSpy).toHaveBeenCalledWith('test info');
          }
        });

        test('logger.debug should call console.debug or console.log', () => {
          loggerUnderTest.debug('test debug');
          // console.debug might not exist in all Node test environments
          if (typeof console.debug === 'function') {
            expect(consoleDebugSpy).toHaveBeenCalledWith('test debug');
          } else {
            expect(consoleLogSpy).toHaveBeenCalledWith('test debug');
          }
        });
      });
    });
  });

  describe('When LOGGING_ENABLED is "false"', () => {
    beforeEach(() => {
      setupLoggerForTest('false');
    });

    test('logger.log should not call console.log', () => {
      loggerUnderTest.log('test log');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('logger.error should not call console.error', () => {
      loggerUnderTest.error('test error');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('logger.warn should not call console.warn', () => {
      loggerUnderTest.warn('test warn');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    test('logger.info should not call console.info or console.log', () => {
      loggerUnderTest.info('test info');
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('logger.debug should not call console.debug or console.log', () => {
      loggerUnderTest.debug('test debug');
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });
});
