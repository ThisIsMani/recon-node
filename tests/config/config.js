describe('Configuration Loading', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // Most important - it clears the cache
    process.env = { ...OLD_ENV }; // Make a copy
    // Clear specific env vars we want to test for defaults
    delete process.env.PORT;
    delete process.env.DB_USER;
    delete process.env.DB_HOST;
    delete process.env.DB_NAME;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_PORT;
  });

  afterAll(() => {
    process.env = OLD_ENV; // Restore old environment
  });

  it('should use default port 3000 if PORT env var is not set', () => {
    const config = require('../../src/config/index');
    expect(config.port).toBe(3000);
  });

  it('should use PORT from env var if set', () => {
    process.env.PORT = '4000';
    const config = require('../../src/config/index');
    expect(config.port).toBe(4000); // PORT should be parsed to a number
  });

  it('should load database configuration from env vars', () => {
    process.env.DB_USER = 'testuser';
    process.env.DB_HOST = 'testhost';
    process.env.DB_NAME = 'testdb';
    process.env.DB_PASSWORD = 'testpassword';
    process.env.DB_PORT = '5433';

    const config = require('../../src/config/index');
    expect(config.database.user).toBe('testuser');
    expect(config.database.host).toBe('testhost');
    expect(config.database.database).toBe('testdb');
    expect(config.database.password).toBe('testpassword');
    expect(config.database.port).toBe(5433); // Parsed to int
  });

  it('should use default database port 5432 if DB_PORT env var is not set', () => {
    const config = require('../../src/config/index');
    expect(config.database.port).toBe(5432);
  });
  
  it('should correctly parse DB_PORT from env var', () => {
    process.env.DB_PORT = '5434';
    const config = require('../../src/config/index');
    expect(config.database.port).toBe(5434);
  });

  it('should have undefined database properties if corresponding env vars are not set', () => {
    // DB_PORT has a default, so it won't be undefined
    const config = require('../../src/config/index');
    expect(config.database.user).toBeUndefined();
    expect(config.database.host).toBeUndefined();
    expect(config.database.database).toBeUndefined();
    expect(config.database.password).toBeUndefined();
  });
});
