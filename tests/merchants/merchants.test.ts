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
        .send({ merchant_id: 'm_test_001', merchant_name: 'Test Merchant One' });
      
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('merchant_id', 'm_test_001');
      expect(response.body).toHaveProperty('merchant_name', 'Test Merchant One');
      
      const dbMerchant = await mockPrismaClient.merchantAccount.findUnique({ where: { merchant_id: 'm_test_001' } });
      expect(dbMerchant).not.toBeNull();
      if (dbMerchant) { // Type guard
        expect(dbMerchant.merchant_name).toBe('Test Merchant One');
      }
    });

    it('should return 409 if merchant_id already exists', async () => {
      await request(server)
        .post('/api/merchants')
        .send({ merchant_id: 'm_test_002', merchant_name: 'Existing Merchant' });
      
      const response = await request(server)
        .post('/api/merchants')
        .send({ merchant_id: 'm_test_002', merchant_name: 'Another Merchant With Same ID' });
      
      expect(response.statusCode).toBe(409);
      expect(response.body.error).toContain('already exists');
    });

    it('should return 400 if merchant_id is missing', async () => {
      const response = await request(server)
        .post('/api/merchants')
        .send({ merchant_name: 'Merchant Without ID' });
      
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('merchant_id and merchant_name are required');
    });

    it('should return 400 if merchant_name is missing', async () => {
      const response = await request(server)
        .post('/api/merchants')
        .send({ merchant_id: 'm_test_003_no_name' });
      
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('merchant_id and merchant_name are required');
    });

    it('should return 400 if merchant_id is not a string', async () => {
      const response = await request(server)
        .post('/api/merchants')
        .send({ merchant_id: 123, merchant_name: 'Numeric ID Merchant' });
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('merchant_id and merchant_name must be strings');
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
        .send({ merchant_id: 'm_get_001', merchant_name: 'Get Merchant 1' });
      await request(server)
        .post('/api/merchants')
        .send({ merchant_id: 'm_get_002', merchant_name: 'Get Merchant 2' });
      
      const response = await request(server).get('/api/merchants');
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ merchant_id: 'm_get_001', merchant_name: 'Get Merchant 1' }),
          expect.objectContaining({ merchant_id: 'm_get_002', merchant_name: 'Get Merchant 2' }),
        ])
      );
    });
  });
});
