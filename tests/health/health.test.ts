import { checkHealth } from '../../src/server/core/health';
import prisma from '../../src/services/prisma';
import logger from '../../src/services/logger'; // Import the actual logger

// Mock the logger module to spy on its methods
jest.mock('../../src/services/logger', () => ({
  __esModule: true, // if logger.ts uses ES6 modules default export
  default: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    query: jest.fn(),
  },
}));

// Mock Prisma's $queryRawUnsafe for one test case
// We only need to mock it for the failure case. For success, we let it run.
const mockQueryRawUnsafe = jest.fn();
jest.mock('../../src/services/prisma', () => ({
  __esModule: true,
  default: {
    $queryRawUnsafe: (...args: any[]) => mockQueryRawUnsafe(...args),
    $disconnect: jest.fn().mockResolvedValue(undefined), // Mock disconnect for afterAll
    // Add other prisma client properties/methods if they are accessed during the test setup/teardown
    // For example, if there are event listeners ($on) being set up in prisma.ts that might run.
    $on: jest.fn(), 
  },
}));


describe('Health Core Logic - checkHealth', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (logger.log as jest.Mock).mockReset();
    (logger.error as jest.Mock).mockReset();
    mockQueryRawUnsafe.mockReset();
  });
  
  afterAll(async () => {
    // No need to call prisma.$disconnect() here if it's mocked,
    // but good practice if it were a real instance for other tests.
    // await prisma.$disconnect(); 
  });

  it('should return status ok and database connected when DB ping is successful', async () => {
    // For this test, we want the actual DB call to succeed if possible,
    // so we don't mock $queryRawUnsafe to reject.
    // If jest.setup.ts ensures DB is up, this should pass.
    // If $queryRawUnsafe is called, mockQueryRawUnsafe will be used.
    // Let's make it resolve for this specific test.
    mockQueryRawUnsafe.mockResolvedValueOnce(undefined);


    const healthStatus = await checkHealth();

    expect(healthStatus.status).toBe('ok');
    expect(healthStatus.database.connected).toBe(true);
    expect(healthStatus.database.status).toBe('connected');
    expect(healthStatus.timestamp).toBeDefined();
    expect(logger.log).toHaveBeenCalledWith('Database connection test via Prisma successful.');
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should return status ok and database disconnected when DB ping fails', async () => {
    const dbError = new Error('DB connection failed');
    mockQueryRawUnsafe.mockRejectedValueOnce(dbError);

    const healthStatus = await checkHealth();

    expect(healthStatus.status).toBe('ok');
    expect(healthStatus.database.connected).toBe(false);
    expect(healthStatus.database.status).toBe('disconnected');
    expect(healthStatus.timestamp).toBeDefined();
    // The logger.error in health.ts now passes the error object and context
    expect(logger.error).toHaveBeenCalledWith(dbError, { context: 'Database connection test via Prisma failed' });
    expect(logger.log).not.toHaveBeenCalledWith('Database connection test via Prisma successful.');
  });
});
