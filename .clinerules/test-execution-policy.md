## Brief overview
This rule outlines the policy for running automated tests during development. This is a global rule applicable to all tasks involving code or project file changes.

## Test Execution Policy
- Automated tests **must be run** after any changes to JavaScript files (`.js`), project configuration files (e.g., `prisma/schema.prisma`, `package.json`), or any other files that could impact the application's behavior or build process.
- This step is crucial and **must be performed before** using `attempt_completion` to finalize a task.
- The primary command for running tests is `npm test`, unless specified otherwise for the project.
- If tests fail, the issues must be addressed, and tests re-run until they pass before considering the task complete.
- If new tests are written or existing tests are modified as part of a task, these should also be run and pass.
