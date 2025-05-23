import { execSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

// Define an async function that Jest will call
export default async (): Promise<void> => {
  console.log('\nJest Global Setup: Loading .env.test for Prisma CLI...');
  
  const envConfig = dotenv.config({ path: path.resolve(__dirname, '.env.test') });

  if (envConfig.error) {
    console.warn('Warning: .env.test file not found or error loading it. Prisma CLI might use wrong DB.');
    // Optionally, throw error if .env.test is critical for setup
    // throw new Error('.env.test file is required for global setup.');
  }
  
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL for test environment is not set. Cannot reset test database.');
    console.error('Please ensure DATABASE_URL is correctly set in .env.test or via other means.');
    console.warn('Proceeding with migrate reset, but DATABASE_URL for test might not be set correctly.');
  } else {
    console.log(`Found DATABASE_URL for test: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':********@')}`); // Mask password
  }

  console.log('Attempting to reset test database (using DATABASE_URL from environment)...');
  try {
    execSync('npx prisma migrate reset --force --skip-seed', {
      stdio: 'inherit', 
      env: { ...process.env }, 
    });
    console.log('Test database reset successfully.');
  } catch (error: any) { // Catch as any or unknown then assert
    const err = error as Error;
    console.error('Failed to reset test database. Ensure test DATABASE_URL in .env.test is correct and the DB server is running.', err.message);
    process.exit(1); 
  }
};
