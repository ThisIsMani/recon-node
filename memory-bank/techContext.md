# Tech Context: Smart Ledger Backend (Node.js)

**Runtime Environment:** Node.js (v14.x or later recommended)

**Web Framework:** Express.js

**Database:** PostgreSQL

**Key Node.js Packages (Dependencies):**
- `express`: Web application framework for Node.js.
- `pg`: (Still a dependency, as Prisma uses it under the hood for PostgreSQL).
- `winston`: For flexible and feature-rich logging.
- `uuid`: For generating unique request IDs.
- `dotenv`: Loads environment variables from a `.env` file into `process.env`.
- `prisma`: CLI for Prisma (dev dependency).
- `@prisma/client`: Prisma Client for database access.
- `src/services/databaseHelpers.ts`: Contains helper functions for common database operations (e.g., `findUniqueOrThrow`).
- `swagger-ui-express`: Serves Swagger UI.
- `swagger-jsdoc`: Generates Swagger/OpenAPI spec from JSDoc comments.
- `typescript`: TypeScript language support (project fully migrated).
- `ts-node`: Allows direct execution of TypeScript files (used in `dev` script).
- `ts-jest`: Jest preset for TypeScript (used for all tests).
- `@types/*`: Various type definition packages for Node.js and libraries.

**Development Tools/Practices:**
- `npm` (or `yarn`): Package manager for Node.js.
- Prisma CLI: For migrations (`prisma migrate dev`) and client generation (`prisma generate`).
- TypeScript Compiler (`tsc`): Used via `npm run build` to compile `.ts` files to `.js` in `./dist`. The `npm run clean` script (using `rm -rf dist`) should be run before `build` for a clean build.
- `tsconfig.json`: TypeScript compiler configuration file.
- `.gitignore`: Specifies intentionally untracked files that Git should ignore (includes TypeScript build artifacts like `/dist` and `*.tsbuildinfo`).
- `README.md`: Contains setup, run instructions, and project overview.
- Environment Variables (`.env`): Used for managing configuration (especially sensitive data like DB credentials and environment-specific settings like PORT).

**Database Interaction:**
- Prisma Client is the primary way to interact with the database.
- Connection pooling is managed by Prisma Client.
- Schema defined in `prisma/schema.prisma`.
- Migrations managed by `prisma migrate dev` and stored in `./migrations/`.
- Asynchronous operations (`async/await`) are used for database calls via Prisma Client.

**API Design:**
- RESTful principles.
- JSON for request and response bodies.
- API routes are prefixed with `/api`.
- API documentation provided via Swagger UI at `/api-docs`.

**Constraints/Considerations:**
- **Database Schema Management:** Handled by Prisma. Schema defined in `prisma/schema.prisma`, migrations in `./migrations/`.
- **Input Validation:** Basic validation in merchant routes. More robust validation (e.g., using `Joi`, `Zod`) should be added for future, more complex endpoints.
- **Authentication & Authorization:** Not yet implemented. Will be required if the API needs to be secured.
- **Logging:**
    - Centralized logger service (`src/services/logger.ts`) using **Winston**.
    - Features:
        - Standard log levels (`error`, `warn`, `info`, `debug`).
        - Human-readable, colorized (for development) console output.
        - Automatic timestamps.
        - **Request ID Injection**: Uses `async_hooks.AsyncLocalStorage` and an Express middleware (`src/server/middleware/requestContext.ts`) to include a unique request ID in logs for better traceability.
        - Handles `Error` objects gracefully, including stack traces.
        - **Prisma Integration**: Prisma Client query and event logs are piped through the Winston logger.
    - Controlled by `LOGGING_ENABLED` environment variable.
- **Testing:** Jest with `ts-jest` is used for all automated tests. All tests are written in TypeScript (`.test.ts`). Manual mocks (e.g., for Prisma client) are used to ensure test stability. Tests are run via `npm test` (which includes a build step if `npm run clean && npm run build && npm test` is used).
- **Production Deployment:** The `start` and `start:consumer` scripts (`node dist/src/server.js` and `node dist/src/recon-engine-runner.js`) run compiled JavaScript from the `./dist` directory. For production, a process manager like PM2 and potentially a reverse proxy (e.g., Nginx) would be recommended.
- **TypeScript Migration:** Completed. The entire `src` and `tests` directories are now in TypeScript.

## Environment Variables

- `PORT`: Defines the port on which the server listens. Defaults to `3000`.
- `DB_USER`: Username for the PostgreSQL database.
- `DB_HOST`: Hostname for the PostgreSQL database.
- `DB_NAME`: Name of the PostgreSQL database.
- `DB_PASSWORD`: Password for the PostgreSQL database.
- `DB_PORT`: Port for the PostgreSQL database.
- `LOGGING_ENABLED`: Set to `"false"` to disable logging. Defaults to `true`.
- `RECON_ENGINE_POLL_INTERVAL_MS`: Controls the polling interval for the recon engine consumer in milliseconds. Defaults to `1000`ms (1 second).
