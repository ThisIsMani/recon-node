// jest.config.js
module.exports = {
  testEnvironment: 'node',
  // Points to the file that runs after the test framework is installed in the environment
  // Used here to load .env.test
  setupFilesAfterEnv: ['./jest.setup.js'], 
  // Points to the file that runs once before all test suites
  // Used here to reset the test database
  globalSetup: './jest.globalSetup.js',   
  // Optional: A file that runs once after all test suites (e.g., for global cleanup)
  // globalTeardown: './jest.globalTeardown.js', 
  
  // Defines the patterns Jest uses to detect test files
  testMatch: [
    '**/tests/**/*.js', // Matches our convention like tests/merchants/merchants.js
    // Default Jest patterns can be included if needed for other conventions:
    // '**/__tests__/**/*.[jt]s?(x)',
    // '**/?(*.)+(spec|test).[tj]s?(x)',
  ],

  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    'src/**/*.js', // Collect coverage from all .js files in src
    '!src/server.js', // Exclude server startup file
    '!src/app.js',    // Exclude main app setup if it's mostly boilerplate
    '!src/config/**/*.js', // Exclude config files
    '!src/services/database.js', // Exclude old DB service if not used
    // Add other files/patterns to ignore for coverage if necessary
  ],
  
  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: [
    '/node_modules/',
    'jest.config.js',
    'jest.setup.js',
    'jest.globalSetup.js',
  ],

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // A list of reporter names that Jest uses when writing coverage reports
  // 'text' is good for console output, 'lcov' for HTML reports
  coverageReporters: ['json', 'lcov', 'text', 'clover'],

  // Option to detect open handles that prevent Jest from exiting cleanly
  // Useful for debugging, already added to npm script via --detectOpenHandles
  // detectOpenHandles: true, 
};
