// This file is referenced in jest.config.js by setupFilesAfterEnv

import dotenv from 'dotenv';

// Load environment variables from .env.test for the Jest environment
dotenv.config({ path: '.env.test' });

// Optional: Increase Jest timeout if needed for async operations like DB reset
// jest.setTimeout(30000); // 30 seconds
