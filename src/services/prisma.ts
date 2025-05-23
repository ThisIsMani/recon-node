import { PrismaClient } from '@prisma/client';

// Define a type for Prisma log levels if you want to make it more specific
// type PrismaLogLevel = 'query' | 'info' | 'warn' | 'error';

const prisma = new PrismaClient({
  // Optional: configure logging
  // log: ['query', 'info', 'warn', 'error'] as PrismaLogLevel[],
});

// Optional: Graceful shutdown for Prisma Client
// This is better handled in the main server file (e.g., src/server.ts)
// to centralize shutdown logic.

/*
async function gracefulShutdownPrisma(): Promise<void> {
  await prisma.$disconnect();
  console.log('Prisma Client disconnected due to app termination.');
  process.exit(0);
}

process.on('SIGINT', gracefulShutdownPrisma);
process.on('SIGTERM', gracefulShutdownPrisma);
*/

export default prisma;
