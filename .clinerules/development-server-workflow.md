## Brief overview
This rule outlines the procedure for server restarts during the development of this Node.js project, particularly before testing API endpoints. This is a global rule.

## Server Restart Policy
- The Node.js server **must be restarted** whenever any project source files (e.g., `.js` files within the `src/` directory, `prisma/schema.prisma`, or any other code/configuration files that affect server behavior) are changed.
- This restart is crucial and **must be performed before** attempting to test any API endpoints (e.g., using `curl` commands) or expecting new functionality to be active.
- Adhering to this ensures that all code modifications are loaded and active, preventing tests or interactions from running against stale or outdated server code, which could lead to confusing or incorrect results.
