## Brief overview
This rule outlines the preferred file naming conventions for this project. This is a global rule.

## File Naming
- Avoid including folder-specific or type-specific suffixes in file names when the directory structure already provides that context.
- **Example (Good):**
    - Route definitions for merchants should be in `src/server/routes/merchant/index.js` or `src/server/routes/merchant.js`.
    - Core logic for merchants should be in `src/server/core/merchant/index.js` or `src/server/core/merchant.js`.
- **Example (To Avoid):**
    - `src/server/routes/merchant.routes.js` (avoid `.routes.js` when already in a `routes` directory or context is clear).
    - `src/server/core/merchant.core.js` (avoid `.core.js`).
- The `index.js` file is typically used as the entry point for a module within a directory.
