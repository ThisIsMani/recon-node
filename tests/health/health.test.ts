import { checkHealth } from '../../src/server/core/health';
import prisma from '../../src/services/prisma'; // Assuming prisma service exports default or is typed
import { PrismaClient } from '@prisma/client'; // For typing prisma mock

describe('Health Core Logic - checkHealth', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on console methods to check for logs without polluting test output
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original console methods
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    jest.restoreAllMocks(); // Restore any other mocks
  });
  
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should return status ok and database connected when DB ping is successful', async () => {
    // Prisma's $queryRawUnsafe is expected to work in a normal test environment with DB connection
    const healthStatus = await checkHealth();

    expect(healthStatus.status).toBe('ok');
    expect(healthStatus.database.connected).toBe(true);
    expect(healthStatus.database.status).toBe('connected');
    expect(healthStatus.timestamp).toBeDefined();
    expect(consoleLogSpy).toHaveBeenCalledWith('Database connection test via Prisma successful.');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should return status ok and database disconnected when DB ping fails', async () => {
    // Mock $queryRawUnsafe to simulate a database connection failure
    // Need to cast prisma to any or use a more specific mock type if $queryRawUnsafe is not directly on the client type
    jest.spyOn(prisma as any, '$queryRawUnsafe').mockRejectedValueOnce(new Error('DB connection failed'));

    const healthStatus = await checkHealth();

    expect(healthStatus.status).toBe('ok'); // Overall status is still 'ok' as the service itself is running
    expect(healthStatus.database.connected).toBe(false);
    expect(healthStatus.database.status).toBe('disconnected');
    expect(healthStatus.timestamp).toBeDefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Database connection test via Prisma failed:', expect.any(Error));
    expect(consoleLogSpy).not.toHaveBeenCalledWith('Database connection test via Prisma successful.');
  });
});
