#!/usr/bin/env node
/**
 * Recon Engine Runner
 * 
 * This is the entry point script for running the reconciliation engine consumer
 * as a standalone process. It initializes the consumer and starts polling for tasks.
 */
import { startConsumer } from './server/core/recon-engine/consumer';
import logger from './services/logger';

// Define default polling interval in milliseconds
const DEFAULT_POLLING_INTERVAL_MS = 3000; // 3 seconds

/**
 * Main function for the recon engine runner
 */
async function main() {
  logger.info('Recon Engine Runner: Initializing...');

  try {
    // Start the consumer with the default polling interval
    // This will also respect the RECON_ENGINE_POLL_INTERVAL_MS environment variable if set
    await startConsumer(DEFAULT_POLLING_INTERVAL_MS);
    logger.info('Recon Engine Runner: Initialization complete');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(new Error(`Failed to start recon engine: ${errorMessage}`));
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  logger.info('Recon Engine Runner: Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Recon Engine Runner: Received SIGTERM, shutting down...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(
    `Recon Engine Runner: Unhandled promise rejection at ${promise}. Reason: ${reason}`,
    { context: 'unhandledRejection' }
  );
});

process.on('uncaughtException', (error) => {
  logger.error(error, { context: 'Recon Engine Runner: Uncaught exception' });
  process.exit(1);
});

// Start the application
main().catch((error) => {
  logger.error(error, { context: 'Recon Engine Runner: Uncaught error in main' });
  process.exit(1);
});
