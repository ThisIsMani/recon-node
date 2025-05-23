import { AppConfig } from '../../src/config/index'; // Import the interface

describe('Configuration Loading', () => {
  const OLD_ENV = { ...process.env }; // Shallow copy

  beforeEach(() => {
    jest.resetModules(); // Clears the module cache for require/import
    process.env = { ...OLD_ENV }; // Restore original env for each test, then clear specific vars

    delete process.env.PORT;
    delete process.env.DB_USER;
    delete process.env.DB_HOST;
    delete process.env.DB_NAME;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_PORT;
  });

  afterAll(() => {
    process.env = OLD_ENV; // Restore original environment after all tests in this suite
  });

  const loadConfig = (): AppConfig => {
    // Dynamically require to pick up env changes after jest.resetModules()
    return require('../../src/config/index').default;
  };

  it('should use default port 3000 if PORT env var is not set', () => {
    const config = loadConfig();
    expect(config.port).toBe(3000);
  });

  it('should use PORT from env var if set', () => {
    process.env.PORT = '4000';
    const config = loadConfig();
    expect(config.port).toBe(4000);
  });

  it('should load database configuration from env vars', () => {
    process.env.DB_USER = 'testuser';
    process.env.DB_HOST = 'testhost';
    process.env.DB_NAME = 'testdb';
    process.env.DB_PASSWORD = 'testpassword';
    process.env.DB_PORT = '5433';

    const config = loadConfig();
    expect(config.database.user).toBe('testuser');
    expect(config.database.host).toBe('testhost');
    expect(config.database.database).toBe('testdb');
    expect(config.database.password).toBe('testpassword');
    expect(config.database.port).toBe(5433);
  });

  it('should use default database port 5432 if DB_PORT env var is not set', () => {
    const config = loadConfig();
    expect(config.database.port).toBe(5432);
  });
  
  it('should correctly parse DB_PORT from env var', () => {
    process.env.DB_PORT = '5434';
    const config = loadConfig();
    expect(config.database.port).toBe(5434);
  });

  it('should have undefined database properties if corresponding env vars are not set', () => {
    const config = loadConfig();
    expect(config.database.user).toBeUndefined();
    expect(config.database.host).toBeUndefined();
    expect(config.database.database).toBeUndefined();
    expect(config.database.password).toBeUndefined();
  });
});
