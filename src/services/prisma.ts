import { PrismaClient, Prisma } from '@prisma/client';
import logger from './logger'; // Import the Winston logger

// Define the log levels for Prisma that we want to subscribe to
const prismaEventLevels: Prisma.LogLevel[] = ['query', 'info', 'warn', 'error'];

// Create LogDefinition array for PrismaClient constructor
const logDefinitions: Prisma.LogDefinition[] = prismaEventLevels.map(level => ({
  emit: 'event',
  level: level,
}));

// Example: In production, you might only want 'warn' and 'error' events
// if (process.env.NODE_ENV === 'production') {
//   logDefinitions = [
//     { emit: 'event', level: 'warn' },
//     { emit: 'event', level: 'error' },
//   ];
// }

const prisma = new PrismaClient({
  log: logDefinitions,
});

// Cast prisma to 'any' to bypass persistent TypeScript errors with $on method overloads
const prismaAsAny = prisma as any;

// Event listener for query logs
prismaAsAny.$on('query', (e: Prisma.QueryEvent) => {
  logger.query(`Query: ${e.query}`, { params: e.params, duration: `${e.duration}ms`, target: e.target });
});

// Event listener for info logs
prismaAsAny.$on('info', (e: Prisma.LogEvent) => {
  logger.info(`Prisma Info: ${e.message}`, { target: e.target });
});

// Event listener for warning logs
prismaAsAny.$on('warn', (e: Prisma.LogEvent) => {
  logger.warn(`Prisma Warn: ${e.message}`, { target: e.target });
});

// Event listener for error logs
prismaAsAny.$on('error', (e: Prisma.LogEvent) => {
  logger.error(`Prisma Error: ${e.message}`, { target: e.target });
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
