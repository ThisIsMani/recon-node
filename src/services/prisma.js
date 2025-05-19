const { PrismaClient } = require('@prisma/client');

// Instantiate PrismaClient
const prisma = new PrismaClient({
  // Optional: configure logging
  // log: ['query', 'info', 'warn', 'error'],
});

// Optional: Graceful shutdown for Prisma Client
// This helps ensure Prisma Client disconnects cleanly when the application exits.
// You might want to hook this into your server's shutdown logic in src/server.js
/*
async function gracefulShutdownPrisma() {
  await prisma.$disconnect();
  console.log('Prisma Client disconnected due to app termination.');
  process.exit(0);
}

process.on('SIGINT', gracefulShutdownPrisma);
process.on('SIGTERM', gracefulShutdownPrisma);
*/

module.exports = prisma;
