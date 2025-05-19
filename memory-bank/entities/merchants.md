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
  - Request Body: `{ "merchant_id": "string", "name": "string" }`
  - Responses:
    - `201 Created`: Merchant created successfully.
    - `400 Bad Request`: Invalid input (e.g., missing fields, `merchant_id` already exists).
    - `500 Internal Server Error`: Other server-side errors.
- `GET /api/merchants`: List all merchant accounts.
  - Responses:
    - `200 OK`: Returns a list of merchants.
    - `500 Internal Server Error`: Server-side errors.

**Core Logic (`src/server/core/merchant/index.js`):**
- **`createMerchant(data)`:**
  - Takes `merchant_id` and `name` as input.
  - Uses `prisma.merchantAccount.create()` to save the new merchant.
  - Handles potential Prisma errors (e.g., unique constraint violation for `merchant_id`).
- **`getMerchants()`:**
  - Uses `prisma.merchantAccount.findMany()` to retrieve all merchants.

**User Stories (Specific to Merchants):**
- As a system administrator, I want to register a new merchant so they can start using the ledger system.
- As a system administrator, I want to view a list of all registered merchants.

**Data Flow (Creating a Merchant):**
1.  HTTP `POST` request to `/api/merchants` with `merchant_id` and `name` in the body.
2.  Route handler in `src/server/routes/merchant/index.js` receives the request.
3.  Input validation is performed.
4.  `createMerchant` core function in `src/server/core/merchant/index.js` is called.
5.  Prisma Client creates a new record in the `MerchantAccount` table.
6.  Result (success or error) is returned to the route handler.
7.  HTTP JSON response is sent (e.g., `201 Created` with merchant data, or an error status).

**Testing (`tests/merchants/merchants.js`):**
- Tests cover successful creation, duplicate `merchant_id` prevention, bad request handling, and listing merchants.
