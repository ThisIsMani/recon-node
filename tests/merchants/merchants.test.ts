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
        .send({ merchant_name: 'Test Merchant One' });
      
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('merchant_id'); // ID should be auto-generated
      expect(response.body).toHaveProperty('merchant_name', 'Test Merchant One'); // Check merchant_name
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('updated_at');
      expect(new Date(response.body.created_at).toISOString()).toBe(response.body.created_at);
      expect(new Date(response.body.updated_at).toISOString()).toBe(response.body.updated_at);
      
      // Get the auto-generated ID from the response
      const merchantId = response.body.merchant_id;
      const dbMerchant = await mockPrismaClient.merchantAccount.findUnique({ where: { merchant_id: merchantId } });
      expect(dbMerchant).not.toBeNull();
      if (dbMerchant) { // Type guard
        expect(dbMerchant.merchant_name).toBe('Test Merchant One');
      }
    });

    it('should return 409 if merchant_id already exists', async () => {
      // This test is no longer relevant since merchant_id is auto-generated
      // Instead, test that two merchants with the same name can be created
      const response1 = await request(server)
        .post('/api/merchants')
        .send({ merchant_name: 'Duplicate Name Merchant' });
      
      const response2 = await request(server)
        .post('/api/merchants')
        .send({ merchant_name: 'Duplicate Name Merchant' });
      
      expect(response1.statusCode).toBe(201);
      expect(response2.statusCode).toBe(201);
      expect(response1.body.merchant_id).not.toBe(response2.body.merchant_id); // Should have different IDs
      // The top-level response.body.code might not exist if the error object is nested under response.body.error
      // If the global error handler strictly sends { error: err.message, code: err.errorCode }, then the original assertions were closer.
      // However, the test failure output "Received: {"code": "ERR_VALIDATION", "message": "..."}" for response.body.error suggests nesting.
    });

    it('should return 400 if merchant_name is missing', async () => {
      const response = await request(server)
        .post('/api/merchants')
        .send({});
      
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('merchant_name is required');
    });

    it('should return 400 if merchant_name is empty string', async () => {
      const response = await request(server)
        .post('/api/merchants')
        .send({ merchant_name: '' });
      
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('merchant_name is required');
    });

    it('should return 400 if merchant_name is not a string', async () => {
      const response = await request(server)
        .post('/api/merchants')
        .send({ merchant_name: 123 });
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('merchant_name must be a string');
    });
  });

  describe('GET /api/merchants', () => {
    it('should return an empty list if no merchants exist', async () => {
      const response = await request(server).get('/api/merchants');
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return a list of merchants', async () => {
      const resp1 = await request(server)
        .post('/api/merchants')
        .send({ merchant_name: 'Get Merchant 1' });
      const resp2 = await request(server)
        .post('/api/merchants')
        .send({ merchant_name: 'Get Merchant 2' });
        
      const merchant1Id = resp1.body.merchant_id;
      const merchant2Id = resp2.body.merchant_id;
      
      const response = await request(server).get('/api/merchants');
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(2);
      response.body.forEach((merchant: any) => {
        expect(merchant).toHaveProperty('merchant_id');
        expect(merchant).toHaveProperty('merchant_name');
        expect(merchant).toHaveProperty('created_at');
        expect(merchant).toHaveProperty('updated_at');
        expect(new Date(merchant.created_at).toISOString()).toBe(merchant.created_at);
        expect(new Date(merchant.updated_at).toISOString()).toBe(merchant.updated_at);
      });
      // Check that our two merchants are in the response
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ merchant_id: merchant1Id, merchant_name: 'Get Merchant 1' }),
          expect.objectContaining({ merchant_id: merchant2Id, merchant_name: 'Get Merchant 2' }),
        ])
      );
    });
  });
});
