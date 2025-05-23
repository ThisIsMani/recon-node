// This script starts the Recon Engine consumer as a standalone process.
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

import logger from './services/logger'; // Assuming logger.js is compatible or will be TS
import { startConsumer } from './server/core/recon-engine/consumer'; // Now TS

logger.log('Attempting to start Recon Engine Consumer...');

startConsumer()
  .then(() => {
    // Because startConsumer contains an infinite loop, this .then() block
    // will likely not be reached if startConsumer() resolves successfully
    // after starting its loop. If startConsumer were to ever actually resolve
    // (e.g., on a graceful shutdown signal not yet implemented), this would log.
    logger.log('Recon Engine Consumer was started and has now (unexpectedly) resolved.');
  })
  .catch((err: Error) => { // Add type for err
    logger.error('Failed to start or unhandled error in Recon Engine Consumer:', err);
    process.exit(1); // Exit with an error code
  });

// Basic signal handling for graceful shutdown
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
signals.forEach(signal => {
  process.on(signal, () => {
    logger.log(`\nReceived ${signal}. Shutting down Recon Engine Consumer...`);
    // TODO: Implement graceful shutdown logic here if needed (e.g., stop polling, finish current task)
    // For now, just exit. In a real app, ensure prisma.$disconnect() or similar cleanup.
    process.exit(0);
  });
});
