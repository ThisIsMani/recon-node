# Tech Context: Smart Ledger Backend (Node.js)

**Runtime Environment:** Node.js (v14.x or later recommended)

**Web Framework:** Express.js

**Database:** PostgreSQL

**Key Node.js Packages (Dependencies):**
- `express`: Web application framework for Node.js.
- `pg`: (Still a dependency, as Prisma uses it under the hood for PostgreSQL).
- `dotenv`: Loads environment variables from a `.env` file into `process.env`.
- `prisma`: CLI for Prisma (dev dependency).
- `@prisma/client`: Prisma Client for database access.
- `swagger-ui-express`: Serves Swagger UI.
- `swagger-jsdoc`: Generates Swagger/OpenAPI spec from JSDoc comments.

**Development Tools/Practices:**
- `npm` (or `yarn`): Package manager for Node.js.
- Prisma CLI: For migrations (`prisma migrate dev`) and client generation (`prisma generate`).
- `.gitignore`: Specifies intentionally untracked files that Git should ignore.
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
- **Logging:** Basic `console.log` and `console.error` are used. A more robust logging solution (e.g., `Winston`, `Pino`) should be considered for production.
- **Testing:** No automated tests are set up yet. Frameworks like Jest, Mocha, Chai would be used.
- **Production Deployment:** The current setup (`node src/server.js`) is suitable for development. For production, a process manager like PM2 and potentially a reverse proxy (e.g., Nginx) would be recommended.
