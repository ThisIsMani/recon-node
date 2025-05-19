// jest.globalSetup.js
const { execSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

module.exports = async () => {
  console.log('\nJest Global Setup: Loading .env.test for Prisma CLI...');
  // Load .env.test to ensure Prisma CLI uses the test database for migrate reset
  const envConfig = dotenv.config({ path: path.resolve(__dirname, '.env.test') });

  if (envConfig.error) {
    console.warn('Warning: .env.test file not found or error loading it. Prisma CLI might use wrong DB.');
    // Optionally, throw error if .env.test is critical for setup
    // throw new Error('.env.test file is required for global setup.');
  }
  
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL for test environment is not set. Cannot reset test database.');
    console.error('Please ensure DATABASE_URL is correctly set in .env.test or via other means.');
    // process.exit(1); // Exit if DATABASE_URL is absolutely required for reset to proceed
    // For now, we'll let it proceed, Prisma CLI might pick up another DATABASE_URL or fail.
    // If it proceeds and DATABASE_URL is not set for test, prisma migrate reset will likely target the dev DB.
    // It's crucial that .env.test is correctly loaded and its DATABASE_URL is used.
    console.warn('Proceeding with migrate reset, but DATABASE_URL for test might not be set correctly.');
  } else {
    console.log(`Found DATABASE_URL for test: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':********@')}`); // Mask password
  }

  console.log('Attempting to reset test database (using DATABASE_URL from environment)...');
  try {
    // Ensure Prisma CLI uses the test database URL from the environment
    // The `dotenv.config` above should have set process.env.DATABASE_URL
    execSync('npx prisma migrate reset --force --skip-seed', {
      stdio: 'inherit', // Show output from Prisma CLI
      env: { ...process.env }, // Pass current environment variables
    });
    console.log('Test database reset successfully.');
  } catch (error) {
    console.error('Failed to reset test database. Ensure test DATABASE_URL in .env.test is correct and the DB server is running.', error.message);
    // Depending on CI/local setup, you might want to exit or allow tests to proceed (they will likely fail)
    process.exit(1); // Critical to stop if DB reset fails
  }
};
