// tests/merchants/merchants.js
const request = require('supertest');
const app = require('../../src/app'); // Ensure this path is correct relative to your tests directory
const prisma = require('../../src/services/prisma'); // Ensure this path is correct

describe('Merchant API Endpoints', () => {
  // The globalSetup script (jest.globalSetup.js) should handle resetting the database
  // before all tests run. So, individual suites might not need extensive beforeAll/afterAll for DB reset.
  // However, cleaning up data *created by this suite* can be good practice.

  afterEach(async () => {
    // Clean up any merchants created specifically by tests in this file
    // This helps keep tests independent if they are not run in a fully isolated DB context per test file.
    // If globalSetup truly resets the DB before *each test file run* (which it does if Jest runs files serially),
    // this might be redundant. But it's safer if test files might run in parallel or if globalSetup is only once per `npm test`.
    // For now, let's keep it to ensure this suite cleans its own specific test data.
    try {
      await prisma.merchantAccount.deleteMany({}); // Deletes all merchants, adjust if more fine-grained control is needed
    } catch (error) {
      // console.error('Error in afterEach cleanup for merchants:', error.message);
      // It's possible the table is already clean or doesn't exist if DB reset failed.
    }
  });

  afterAll(async () => {
    // Disconnect Prisma client after all tests in this file are done
    // This is important to prevent open handles.
    await prisma.$disconnect();
  });

  describe('POST /api/merchants', () => {
    it('should create a new merchant successfully', async () => {
      const response = await request(app)
        .post('/api/merchants')
        .send({ merchant_id: 'm_test_001', merchant_name: 'Test Merchant One' });
      
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('merchant_id', 'm_test_001');
      expect(response.body).toHaveProperty('merchant_name', 'Test Merchant One');
      
      // Verify it's in the database
      const dbMerchant = await prisma.merchantAccount.findUnique({ where: { merchant_id: 'm_test_001' } });
      expect(dbMerchant).not.toBeNull();
      expect(dbMerchant.merchant_name).toBe('Test Merchant One');
    });

    it('should return 409 if merchant_id already exists', async () => {
      // First, create a merchant directly or via API
      await request(app)
        .post('/api/merchants')
        .send({ merchant_id: 'm_test_002', merchant_name: 'Existing Merchant' });
      
      // Then, attempt to create another with the same ID
      const response = await request(app)
        .post('/api/merchants')
        .send({ merchant_id: 'm_test_002', merchant_name: 'Another Merchant With Same ID' });
      
      expect(response.statusCode).toBe(409);
      expect(response.body.error).toContain('already exists');
    });

    it('should return 400 if merchant_id is missing', async () => {
      const response = await request(app)
        .post('/api/merchants')
        .send({ merchant_name: 'Merchant Without ID' });
      
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('merchant_id and merchant_name are required');
    });

    it('should return 400 if merchant_name is missing', async () => {
      const response = await request(app)
        .post('/api/merchants')
        .send({ merchant_id: 'm_test_003_no_name' });
      
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('merchant_id and merchant_name are required');
    });

    it('should return 400 if merchant_id is not a string', async () => {
      const response = await request(app)
        .post('/api/merchants')
        .send({ merchant_id: 123, merchant_name: 'Numeric ID Merchant' });
      expect(response.statusCode).toBe(400);
      // The exact error message depends on your validation logic in the route.
      // Assuming it checks for string type as per previous merchant route code.
      expect(response.body.error).toContain('merchant_id and merchant_name must be strings');
    });
  });

  describe('GET /api/merchants', () => {
    it('should return an empty list if no merchants exist', async () => {
      // Ensure DB is clean for this test (afterEach should handle it from previous tests)
      const response = await request(app).get('/api/merchants');
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return a list of merchants', async () => {
      // Create some merchants
      await request(app)
        .post('/api/merchants')
        .send({ merchant_id: 'm_get_001', merchant_name: 'Get Merchant 1' });
      await request(app)
        .post('/api/merchants')
        .send({ merchant_id: 'm_get_002', merchant_name: 'Get Merchant 2' });
      
      const response = await request(app).get('/api/merchants');
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(2);
      // Order might not be guaranteed, so check for presence
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ merchant_id: 'm_get_001', merchant_name: 'Get Merchant 1' }),
          expect.objectContaining({ merchant_id: 'm_get_002', merchant_name: 'Get Merchant 2' }),
        ])
      );
    });
  });
});
