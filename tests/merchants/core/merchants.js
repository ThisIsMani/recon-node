const { createMerchant, listMerchants } = require('../../../src/server/core/merchant/index');
const prisma = require('../../../src/services/prisma');

describe('Merchant Core Logic', () => {
  let consoleErrorSpy;

  beforeEach(async () => {
    await prisma.merchantAccount.deleteMany({});
    // Spy on console.error and provide a mock implementation to suppress output
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore the original console.error and any other mocks
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
  });

  // Clean up after all tests in this suite are done
  afterAll(async () => {
    await prisma.merchantAccount.deleteMany({});
    await prisma.$disconnect(); // Disconnect Prisma client
  });

  describe('createMerchant', () => {
    it('should create a new merchant successfully', async () => {
      const merchantData = { merchant_id: 'merchant123', merchant_name: 'Test Merchant' };
      const newMerchant = await createMerchant(merchantData);

      expect(newMerchant).toBeDefined();
      expect(newMerchant.merchant_id).toBe(merchantData.merchant_id);
      expect(newMerchant.merchant_name).toBe(merchantData.merchant_name);

      // Verify it's in the database
      const dbMerchant = await prisma.merchantAccount.findUnique({
        where: { merchant_id: merchantData.merchant_id },
      });
      expect(dbMerchant).toEqual(newMerchant);
    });

    it('should throw an error if merchant ID already exists', async () => {
      const merchantData = { merchant_id: 'merchant123', merchant_name: 'Test Merchant' };
      await createMerchant(merchantData); // Create first merchant

      // Attempt to create another merchant with the same ID
      try {
        await createMerchant(merchantData);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe(`Merchant with ID '${merchantData.merchant_id}' already exists.`);
      }
    });

    it('should throw a generic error for other database issues during creation', async () => {
      const merchantData = { merchant_id: 'merchant-fail', merchant_name: 'Fail Merchant' };
      // Mock Prisma's create to throw a non-P2002 error
      jest.spyOn(prisma.merchantAccount, 'create').mockRejectedValueOnce(new Error('Some other DB error'));

      try {
        await createMerchant(merchantData);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Could not create merchant account.');
      }
      // jest.restoreAllMocks(); // Will be handled by afterEach
    });
  });

  describe('listMerchants', () => {
    it('should return an empty array if no merchants exist', async () => {
      const merchants = await listMerchants();
      expect(merchants).toEqual([]);
    });

    it('should return a list of merchants if they exist', async () => {
      const merchant1Data = { merchant_id: 'merchant1', merchant_name: 'Merchant One' };
      const merchant2Data = { merchant_id: 'merchant2', merchant_name: 'Merchant Two' };
      await createMerchant(merchant1Data);
      await createMerchant(merchant2Data);

      const merchants = await listMerchants();
      expect(merchants.length).toBe(2);
      expect(merchants).toEqual(
        expect.arrayContaining([
          expect.objectContaining(merchant1Data),
          expect.objectContaining(merchant2Data),
        ])
      );
    });

    it('should throw a generic error for database issues during listing', async () => {
      // Mock Prisma's findMany to throw an error
      jest.spyOn(prisma.merchantAccount, 'findMany').mockRejectedValueOnce(new Error('DB list error'));

      try {
        await listMerchants();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Could not retrieve merchant accounts.');
      }
      // jest.restoreAllMocks(); // Will be handled by afterEach
    });
  });
});
