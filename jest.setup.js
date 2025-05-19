// jest.setup.js
// This file is referenced in jest.config.js by setupFilesAfterEnv

// Load environment variables from .env.test for the Jest environment
require('dotenv').config({ path: '.env.test' });

// Optional: Increase Jest timeout if needed for async operations like DB reset
// jest.setTimeout(30000); // 30 seconds
