// src/services/__mocks__/prisma.ts

// This is a manual mock for the Prisma client.
// It should export an object that mimics the structure of the actual PrismaClient instance,
// with Jest mock functions for the methods used in tests.

// Define a type for the mock to help with self-referencing issues
type PrismaMockType = {
  merchantAccount: { [key: string]: jest.Mock };
  account: { [key: string]: jest.Mock };
  transaction: { [key: string]: jest.Mock };
  entry: { [key: string]: jest.Mock };
  stagingEntry: { [key: string]: jest.Mock };
  reconRule: { [key: string]: jest.Mock };
  processTracker: { [key: string]: jest.Mock };
  $transaction: jest.Mock;
  $disconnect: jest.Mock;
  // Add other models/methods if they become necessary
};

const prismaMock: PrismaMockType = {
  merchantAccount: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    // Add other methods as needed by tests
  },
  account: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    // Add other methods as needed by tests
  },
  transaction: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    // Add other methods as needed by tests
  },
  entry: {
    create: jest.fn(),
    createMany: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    // Add other methods as needed by tests
  },
  stagingEntry: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(), // Added from previous test errors
    upsert: jest.fn(),     // Added from previous test errors
    delete: jest.fn(),      // Added from previous test errors
    // Add other methods as needed by tests
  },
  reconRule: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
    // Add other methods as needed by tests
  },
  processTracker: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    // Add other methods as needed by tests
  },
  // Mock for $transaction
  $transaction: jest.fn(async (callback: (tx: PrismaMockType) => Promise<any>): Promise<any> => {
    // This mock $transaction should provide a mock Prisma transaction client (tx)
    // to the callback, which also has the mocked model methods.
    // For simplicity, the tx client can mirror the main mock.
    // A more sophisticated mock might have a separate tx client structure if needed.
    return callback(prismaMock); 
  }),
  $disconnect: jest.fn(), // Added from previous test errors
};

export default prismaMock;
