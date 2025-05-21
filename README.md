# Smart Ledger Backend

This is a Node.js backend service for a Smart Ledger application, using Express.js and PostgreSQL.

## Prerequisites

- Node.js (v14.x or later recommended)
- npm (comes with Node.js) or yarn
- PostgreSQL server installed and running.

## Setup Instructions

1.  **Clone the Repository** (if applicable)
    ```bash
    # git clone <repository-url>
    # cd <repository-name>
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```
    or if you prefer yarn:
    ```bash
    yarn install
    ```

3.  **Configure Environment Variables**
    - Copy the example environment file:
      ```bash
      cp .env.example .env
      ```
    - Edit the `.env` file with your actual PostgreSQL connection details and any other required settings:
      ```
      PORT=3000

      DB_USER=your_postgres_user
      DB_HOST=localhost
      DB_NAME=your_database_name  # Ensure this database exists in your PostgreSQL server
      DB_PASSWORD=your_postgres_password
      DB_PORT=5432
      ```
      **Important:** You need to create the database specified in `DB_NAME` in your PostgreSQL instance if it doesn't already exist.

## Setup Instructions (Continued)

4.  **Database Migrations (Prisma)**
    -   After configuring your `.env` file with the `DATABASE_URL` (Prisma uses this, e.g., `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`), run the initial migration:
        ```bash
        npx prisma migrate dev --name init
        ```
    -   This will create the necessary tables in your database based on the schema defined in `prisma/schema.prisma`.
    -   To create new migrations after changing `prisma/schema.prisma`:
        ```bash
        npx prisma migrate dev --name your_migration_name
        ```
    -   To generate Prisma Client after schema changes (if not done by `migrate dev`):
        ```bash
        npx prisma generate
        ```

## Running the Application

### Running Tests

To run the automated API tests:
```bash
npm test
```
This will execute Jest tests defined in the `tests/` directory. Ensure your test database (`recon_node_test`) is accessible and the `DATABASE_URL` in `.env.test` is correctly configured. The tests will automatically reset and migrate the test database before running.

### Starting the Server

-   **Start the server:**
    ```bash
    npm start
    ```
-   The server will typically start on `http://localhost:3000` (or the port specified in your `.env` file).
-   API documentation is available at `/api-docs` (e.g., `http://localhost:3000/api-docs`).

### Starting the Recon Engine Consumer

-   **Start the consumer service (for processing staging entries):**
    ```bash
    npm run start:consumer
    ```
-   This service runs independently and polls for tasks to process staging entries into final ledger transactions. Ensure your `DATABASE_URL` is correctly configured in `.env` for this service as well.

## Available API Endpoints

See `/api-docs` for interactive documentation.

### Health Check

-   **GET** `/api/health`
    -   Checks the status of the server and its database connection.
    -   **Success Response (200 OK):**
        ```json
        {
            "status": "ok",
            "timestamp": "2023-10-27T10:30:00.123Z",
            "database": {
                "connected": true,
                "status": "connected"
            }
        }
        ```
    -   **Error Response (if DB connection fails):**
        ```json
        {
            "status": "ok", // Server is running
            "timestamp": "2023-10-27T10:30:00.456Z",
            "database": {
                "connected": false,
                "status": "disconnected"
            }
        }
        ```

## Project Structure

```
/
├── src/
│   ├── app.js             # Main Express application setup
│   ├── server.js          # HTTP server initialization
│   ├── config/            # Configuration files (db.js, index.js)
│   ├── services/          # Shared services (e.g., database.js)
│   ├── db_models/         # Database schema definitions/ORM models
│   ├── api_models/        # Request/response structures/validation schemas
│   ├── server/            # Server-specific logic
│   │   ├── routes/        # API route definitions (index.js, health.js)
│   │   └── core/          # Core business logic (health.js)
│   └── utils/             # Utility functions
├── .env                 # Environment variables (ignored by Git)
├── .env.example         # Example environment file
├── .gitignore           # Specifies intentionally untracked files
├── README.md            # This file
└── package.json         # Project metadata and dependencies
└── package-lock.json    # Records exact versions of dependencies
```

### Merchant Accounts

-   **POST** `/api/merchants`
    -   Creates a new merchant account.
    -   **Request Body:**
        ```json
        {
          "merchant_id": "string (unique)",
          "merchant_name": "string"
        }
        ```
    -   **Success Response (201 Created):** The created merchant object.
    -   **Error Responses:** 400 (Bad Request), 409 (Conflict if `merchant_id` exists).

    -   **GET** `/api/merchants`
    -   Retrieves a list of all merchant accounts.
    -   **Success Response (200 OK):** An array of merchant objects.

### Account Management (under a specific Merchant)

-   **POST** `/api/merchants/:merchant_id/accounts`
    -   Creates a new account for the specified merchant.
    -   **Request Body:**
        ```json
        {
          "account_name": "string",
          "account_type": "DEBIT_NORMAL | CREDIT_NORMAL",
          "currency": "string (3-letter code, e.g., USD)"
        }
        ```
    -   **Success Response (201 Created):** The created account object (excluding `created_at`, `updated_at`).
    -   **Error Responses:** 400 (Bad Request, e.g., missing fields, merchant not found), 500 (Server Error).

-   **GET** `/api/merchants/:merchant_id/accounts`
    -   Retrieves a list of all accounts for the specified merchant.
    -   **Success Response (200 OK):** An array of account objects (excluding `created_at`, `updated_at`, and including placeholder balances).

-   **DELETE** `/api/merchants/:merchant_id/accounts/:account_id`
    -   Deletes a specific account for the specified merchant.
    -   **Success Response (200 OK):** The deleted account object (excluding `created_at`, `updated_at`).
    -   **Error Responses:** 404 (Not Found, if account or merchant is not found, or account does not belong to merchant), 500 (Server Error).

## Next Steps (Development)

- Define further database schema in `prisma/schema.prisma` (e.g., for Accounts, Entries, Transactions).
- Run `npx prisma migrate dev --name <migration_name>` to apply schema changes.
- Implement API endpoints in `src/server/routes/` and corresponding core logic in `src/server/core/` for Smart Ledger operations.
