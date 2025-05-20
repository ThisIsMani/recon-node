// src/recon-engine-runner.js
// This script starts the Recon Engine consumer as a standalone process.

// Ensure environment variables are loaded (e.g., for DATABASE_URL)
// Adjust path to .env if this script is moved or if .env is not in project root.
require('dotenv').config(); 

const { startConsumer } = require('./server/core/recon-engine/consumer');

console.log('Attempting to start Recon Engine Consumer...');

startConsumer()
  .then(() => {
    // Because startConsumer contains an infinite loop, this .then() block
    // will likely not be reached if startConsumer() resolves successfully
    // after starting its loop. If startConsumer were to ever actually resolve
    // (e.g., on a graceful shutdown signal not yet implemented), this would log.
    console.log('Recon Engine Consumer was started and has now (unexpectedly) resolved.');
  })
  .catch(err => {
    console.error('Failed to start or unhandled error in Recon Engine Consumer:', err);
    process.exit(1); // Exit with an error code
  });

// Basic signal handling for graceful shutdown (very rudimentary)
// A more robust solution would involve closing DB connections, etc.
const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
signals.forEach(signal => {
  process.on(signal, () => {
    console.log(`\nReceived ${signal}. Shutting down Recon Engine Consumer...`);
    // TODO: Implement graceful shutdown logic here if needed (e.g., stop polling, finish current task)
    process.exit(0);
  });
});
