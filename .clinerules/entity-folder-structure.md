## Brief overview
This rule outlines the preferred folder structure for organizing code related to specific business entities within the Node.js project. This applies globally to modules like routes and core logic, but not to top-level directories like migrations.

## Folder Structure for Entities
- When working with a specific business entity (e.g., "merchant", "account", "transaction"), create a dedicated sub-folder named after that entity within the relevant module directories.
- This applies to directories such as `src/server/routes/` and `src/server/core/`.
- **Example:**
    - Merchant-related routes should be in `src/server/routes/merchant/`.
    - Merchant-related core logic should be in `src/server/core/merchant/`.
    - Account-related routes would be in `src/server/routes/account/`.
    - Account-related core logic would be in `src/server/core/account/`.
- This rule does not apply to top-level project directories like `./migrations/` or `src/db_models/` where files might be organized differently (e.g., by date or type).
- Typically, an `index.js` file within these entity-specific folders will serve as the entry point or aggregator for that entity's module.
