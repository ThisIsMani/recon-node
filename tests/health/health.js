const { checkHealth } = require('../../src/server/core/health');
const prisma = require('../../src/services/prisma');

describe('Health Core Logic - checkHealth', () => {
  let consoleErrorSpy;
  let consoleLogSpy;

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
    jest.spyOn(prisma, '$queryRawUnsafe').mockRejectedValueOnce(new Error('DB connection failed'));

    const healthStatus = await checkHealth();

    expect(healthStatus.status).toBe('ok'); // Overall status is still 'ok' as the service itself is running
    expect(healthStatus.database.connected).toBe(false);
    expect(healthStatus.database.status).toBe('disconnected');
    expect(healthStatus.timestamp).toBeDefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Database connection test via Prisma failed:', expect.any(Error));
    expect(consoleLogSpy).not.toHaveBeenCalledWith('Database connection test via Prisma successful.');
  });
});
