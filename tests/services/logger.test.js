// tests/services/logger.test.js

const logger = require('../../src/services/logger');

describe('Logger Service', () => {
  let originalLogEnv;
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;
  let consoleInfoSpy;
  let consoleDebugSpy;

  beforeEach(() => {
    // Store original LOGGING_ENABLED and mock console methods
    originalLogEnv = process.env.LOGGING_ENABLED;
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original LOGGING_ENABLED and console methods
    process.env.LOGGING_ENABLED = originalLogEnv;
    jest.restoreAllMocks();
  });

  describe('When LOGGING_ENABLED is true or undefined', () => {
    const testCases = [
      { name: 'LOGGING_ENABLED is "true"', value: 'true' },
      { name: 'LOGGING_ENABLED is undefined', value: undefined },
      { name: 'LOGGING_ENABLED is empty string', value: '' },
    ];

    testCases.forEach(tc => {
      describe(tc.name, () => {
        beforeEach(() => {
          // process.env.LOGGING_ENABLED is a string or undefined
          if (tc.value === undefined) {
            delete process.env.LOGGING_ENABLED;
          } else {
            process.env.LOGGING_ENABLED = tc.value;
          }
          // We need to re-require the logger for it to pick up the new env variable value
          jest.resetModules();
          const reloadedLogger = require('../../src/services/logger');
          global.loggerUnderTest = reloadedLogger; // Make it accessible in tests
        });
        
        afterEach(() => {
            delete global.loggerUnderTest; // Clean up
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
          if (console.info) {
            expect(consoleInfoSpy).toHaveBeenCalledWith('test info');
          } else {
            expect(consoleLogSpy).toHaveBeenCalledWith('test info');
          }
        });

        test('logger.debug should call console.debug or console.log', () => {
          loggerUnderTest.debug('test debug');
          if (console.debug) {
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
      process.env.LOGGING_ENABLED = 'false';
      jest.resetModules();
      const reloadedLogger = require('../../src/services/logger');
      global.loggerUnderTest = reloadedLogger;
    });

    afterEach(() => {
        delete global.loggerUnderTest;
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
