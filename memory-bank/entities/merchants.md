# Entity: Merchants

**Overview:**
Merchants represent distinct business entities or clients within the Smart Ledger system. Each merchant can have multiple associated accounts.

**Prisma Schema Definition (from `prisma/schema.prisma`):**
```prisma
model MerchantAccount {
  id          String    @id @default(cuid())
  merchant_id String    @unique // External merchant identifier
  name        String
  created_at  DateTime  @default(now())
  updated_at  DateTime  @updatedAt
  accounts    Account[] // Relation to Account model
}
```

**API Endpoints:**
- `POST /api/merchants`: Create a new merchant account.
  - Request Body: `{ "merchant_name": "string" }`
  - Responses:
    - `201 Created`: Merchant created successfully with an auto-generated merchant_id.
    - `400 Bad Request`: Invalid input (e.g., missing fields, invalid field types).
    - `500 Internal Server Error`: Other server-side errors.
- `GET /api/merchants`: List all merchant accounts.
  - Responses:
    - `200 OK`: Returns a list of merchants.
    - `500 Internal Server Error`: Server-side errors.

**Core Logic (`src/server/core/merchant/index.ts`):**
- **`createMerchant(data)`:**
  - Takes `merchant_name` as input.
  - Automatically generates a unique `merchant_id` based on timestamp and random number.
  - Uses `prisma.merchantAccount.create()` to save the new merchant.
  - Handles potential Prisma errors (e.g., rare case of ID collision).
- **`getMerchants()`:**
  - Uses `prisma.merchantAccount.findMany()` to retrieve all merchants.

**User Stories (Specific to Merchants):**
- As a system administrator, I want to register a new merchant so they can start using the ledger system.
- As a system administrator, I want to view a list of all registered merchants.

**Data Flow (Creating a Merchant):**
1.  HTTP `POST` request to `/api/merchants` with `merchant_name` in the body.
2.  Route handler in `src/server/routes/merchant/index.ts` receives the request.
3.  Input validation is performed.
4.  `createMerchant` core function in `src/server/core/merchant/index.ts` is called.
5.  A unique `merchant_id` is auto-generated.
6.  Prisma Client creates a new record in the `MerchantAccount` table.
7.  Result (success or error) is returned to the route handler.
8.  HTTP JSON response is sent (e.g., `201 Created` with merchant data, or an error status).

**Testing (`tests/merchants/merchants.test.ts`):**
- Tests cover successful creation, missing required fields, invalid data types, and listing merchants.
- Tests verify that unique IDs are generated for each merchant.
