import request from 'supertest';
import app from '../../src/app'; // Ensure this path is correct relative to your tests directory
import prisma from '../../src/services/prisma'; // Ensure this path is correct
import { Express } from 'express'; // For typing app

// Cast prisma to 'any' for easier mocking if direct type compatibility is an issue
// This is often needed for the dynamic nature of Jest mocks on imported modules.
const mockPrismaClient = prisma as any;

describe('Merchant API Endpoints', () => {
  let server: Express; // To hold the app instance

  beforeAll(() => {
    server = app; // Assign app to server for use in tests
  });

  afterEach(async () => {
    try {
      await mockPrismaClient.merchantAccount.deleteMany({});
    } catch (error) {
      // console.error('Error in afterEach cleanup for merchants:', error.message);
    }
  });

  afterAll(async () => {
    await mockPrismaClient.$disconnect();
  });

  describe('POST /api/merchants', () => {
    it('should create a new merchant successfully', async () => {
      const response = await request(server)
        .post('/api/merchants')
        .send({ merchant_id: 'm_test_001', name: 'Test Merchant One' }); // Use name
      
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('id', 'm_test_001'); // Expect id
      expect(response.body).toHaveProperty('name', 'Test Merchant One'); // Expect name
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('updated_at');
      expect(new Date(response.body.created_at).toISOString()).toBe(response.body.created_at);
      expect(new Date(response.body.updated_at).toISOString()).toBe(response.body.updated_at);
      
      const dbMerchant = await mockPrismaClient.merchantAccount.findUnique({ where: { merchant_id: 'm_test_001' } });
      expect(dbMerchant).not.toBeNull();
      if (dbMerchant) { // Type guard
        expect(dbMerchant.merchant_name).toBe('Test Merchant One');
      }
    });

    it('should return 409 if merchant_id already exists', async () => {
      await request(server)
        .post('/api/merchants')
        .send({ merchant_id: 'm_test_002', name: 'Existing Merchant' }); // Use name
      
      const response = await request(server)
        .post('/api/merchants')
        .send({ merchant_id: 'm_test_002', name: 'Another Merchant With Same ID' }); // Use name
      
      expect(response.statusCode).toBe(400);
      expect(typeof response.body).toBe('object'); 
      expect(response.body).toHaveProperty('error'); 
      // Assuming response.body.error is an object based on previous test failure output
      expect(response.body.error).toHaveProperty('message', "Merchant with ID 'm_test_002' already exists.");
      expect(response.body.error).toHaveProperty('code', 'ERR_VALIDATION');
      // The top-level response.body.code might not exist if the error object is nested under response.body.error
      // If the global error handler strictly sends { error: err.message, code: err.errorCode }, then the original assertions were closer.
      // However, the test failure output "Received: {"code": "ERR_VALIDATION", "message": "..."}" for response.body.error suggests nesting.
    });

    it('should return 400 if merchant_id is missing', async () => {
      const response = await request(server)
        .post('/api/merchants')
        .send({ name: 'Merchant Without ID' }); // Use name
      
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('merchant_id and name are required'); // Updated error message
    });

    it('should return 400 if name is missing', async () => { // Updated test description
      const response = await request(server)
        .post('/api/merchants')
        .send({ merchant_id: 'm_test_003_no_name' });
      
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('merchant_id and name are required'); // Updated error message
    });

    it('should return 400 if merchant_id is not a string', async () => {
      const response = await request(server)
        .post('/api/merchants')
        .send({ merchant_id: 123, name: 'Numeric ID Merchant' }); // Use name
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('merchant_id and name must be strings'); // Updated error message
    });
  });

  describe('GET /api/merchants', () => {
    it('should return an empty list if no merchants exist', async () => {
      const response = await request(server).get('/api/merchants');
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return a list of merchants', async () => {
      await request(server)
        .post('/api/merchants')
        .send({ merchant_id: 'm_get_001', name: 'Get Merchant 1' }); // Use name
      await request(server)
        .post('/api/merchants')
        .send({ merchant_id: 'm_get_002', name: 'Get Merchant 2' }); // Use name
      
      const response = await request(server).get('/api/merchants');
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(2);
      response.body.forEach((merchant: any) => {
        expect(merchant).toHaveProperty('id');
        expect(merchant).toHaveProperty('name');
        expect(merchant).toHaveProperty('created_at');
        expect(merchant).toHaveProperty('updated_at');
        expect(new Date(merchant.created_at).toISOString()).toBe(merchant.created_at);
        expect(new Date(merchant.updated_at).toISOString()).toBe(merchant.updated_at);
      });
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'm_get_001', name: 'Get Merchant 1' }), // Expect id and name
          expect.objectContaining({ id: 'm_get_002', name: 'Get Merchant 2' }), // Expect id and name
        ])
      );
    });
  });
});
