module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Points to the file that runs after the test framework is installed in the environment
  // Used here to load .env.test
  setupFilesAfterEnv: ['./jest.setup.ts'], 
  // Points to the file that runs once before all test suites
  // Used here to reset the test database
  globalSetup: './jest.globalSetup.ts',   
  // Optional: A file that runs once after all test suites (e.g., for global cleanup)
  // globalTeardown: './jest.globalTeardown.js', 
  
  // Defines the patterns Jest uses to detect test files
  testMatch: [
    '**/tests/**/*.[jt]s?(x)', // Matches .js, .jsx, .ts, .tsx files in tests directory
  ],
  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],

  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    'src/**/*.ts', // Collect coverage primarily from .ts files in src
    '!src/server.ts', 
    '!src/app.ts',    
    '!src/config/**/*.ts', 
    '!src/services/database.ts', // Exclude pg database service if Prisma is primary
    // Add other files/patterns to ignore for coverage if necessary
  ],
  
  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: [
    '/node_modules/',
    'jest.config.js',
    'jest.setup.ts',
    'jest.globalSetup.ts',
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
