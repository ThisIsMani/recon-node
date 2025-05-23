## Plan: TypeScript Migration - Health API Pilot

**Objective:** Configure the project for TypeScript and convert the Health API components (`/api/health` route, core logic, and tests) to TypeScript as an initial pilot.

**Date:** 2025-05-23
**Plan File:** `memory-bank/plans/2025-05-23-typescript-health-api-pilot.md`

**Phase 1: TypeScript Setup (Prerequisites)**

- [ ] **1. Save this revised plan**
    - Action: Write this plan to `memory-bank/plans/2025-05-23-typescript-health-api-pilot.md`.
- [ ] **2. Install TypeScript and related dependencies**
    - Action: Run `npm install --save-dev typescript ts-node ts-jest @types/node @types/express @types/jest @types/supertest @types/pg @types/cors @types/multer`.
- [ ] **3. Create `tsconfig.json`**
    - Action: Create the TypeScript configuration file (content as previously discussed, with `allowJs: true`, `outDir: "./dist"`, etc.).
- [ ] **4. Update `package.json` scripts**
    - Action: Add `build` script (`tsc`), update `start` and `start:consumer` scripts to use compiled output from `./dist`.
- [ ] **5. Update `jest.config.js`**
    - Action: Configure Jest for TypeScript (using `ts-jest` preset, update `testMatch` and `collectCoverageFrom`).
- [ ] **6. Read existing `.gitignore` content**
    - Action: Read the content of the current `.gitignore` file.
- [ ] **7. Update `.gitignore`**
    - Action: Append TypeScript build artifacts (like `/dist` directory and `*.tsbuildinfo`) to the existing `.gitignore` content.

**Phase 2: Health API TypeScript Conversion**

- [ ] **8. Read `src/server/core/health.js`**
- [ ] **9. Convert `src/server/core/health.js` to `src/server/core/health.ts`**
    - Action: Rename the file and add TypeScript typings.
- [ ] **10. Read `src/server/routes/health.js`**
- [ ] **11. Convert `src/server/routes/health.js` to `src/server/routes/health.ts`**
    - Action: Rename the file, update imports, and add TypeScript typings.
- [ ] **12. Read `src/server/routes/index.js`**
- [ ] **13. Update `src/server/routes/index.js` to import the health route correctly**
    - Action: Modify the import statement for the health route.
- [ ] **14. Read `tests/health/health.js`**
- [ ] **15. Convert `tests/health/health.js` to `tests/health/health.test.ts`**
    - Action: Rename the test file and update it for TypeScript.

**Phase 3: Verification & Documentation**

- [ ] **16. Build the project**
    - Action: Run `npm run build`.
- [ ] **17. Run tests**
    - Action: Execute `npm test` to ensure the Health API tests (and all other tests) pass.
- [ ] **18. Update Memory Bank**
    - Action: Document the new TypeScript setup and Health API conversion in `memory-bank/techContext.md`, and update `memory-bank/activeContext.md` and `memory-bank/progress.md`.

<!--
{
  "plan": [
    {
      "id": 1,
      "description": "Save this revised plan",
      "tool": "write_to_file",
      "args": {
        "path": "memory-bank/plans/2025-05-23-typescript-health-api-pilot.md",
        "content": "## Plan: TypeScript Migration - Health API Pilot\n\n**Objective:** Configure the project for TypeScript and convert the Health API components (`/api/health` route, core logic, and tests) to TypeScript as an initial pilot.\n\n**Date:** 2025-05-23\n**Plan File:** `memory-bank/plans/2025-05-23-typescript-health-api-pilot.md`\n\n**Phase 1: TypeScript Setup (Prerequisites)**\n\n- [ ] **1. Save this revised plan**\n    - Action: Write this plan to `memory-bank/plans/2025-05-23-typescript-health-api-pilot.md`.\n- [ ] **2. Install TypeScript and related dependencies**\n    - Action: Run `npm install --save-dev typescript ts-node ts-jest @types/node @types/express @types/jest @types/supertest @types/pg @types/cors @types/multer`.\n- [ ] **3. Create `tsconfig.json`**\n    - Action: Create the TypeScript configuration file (content as previously discussed, with `allowJs: true`, `outDir: \"./dist\"`, etc.).\n- [ ] **4. Update `package.json` scripts**\n    - Action: Add `build` script (`tsc`), update `start` and `start:consumer` scripts to use compiled output from `./dist`.\n- [ ] **5. Update `jest.config.js`**\n    - Action: Configure Jest for TypeScript (using `ts-jest` preset, update `testMatch` and `collectCoverageFrom`).\n- [ ] **6. Read existing `.gitignore` content**\n    - Action: Read the content of the current `.gitignore` file.\n- [ ] **7. Update `.gitignore`**\n    - Action: Append TypeScript build artifacts (like `/dist` directory and `*.tsbuildinfo`) to the existing `.gitignore` content.\n\n**Phase 2: Health API TypeScript Conversion**\n\n- [ ] **8. Read `src/server/core/health.js`**\n- [ ] **9. Convert `src/server/core/health.js` to `src/server/core/health.ts`**\n    - Action: Rename the file and add TypeScript typings.\n- [ ] **10. Read `src/server/routes/health.js`**\n- [ ] **11. Convert `src/server/routes/health.js` to `src/server/routes/health.ts`**\n    - Action: Rename the file, update imports, and add TypeScript typings.\n- [ ] **12. Read `src/server/routes/index.js`**\n- [ ] **13. Update `src/server/routes/index.js` to import the health route correctly**\n    - Action: Modify the import statement for the health route.\n- [ ] **14. Read `tests/health/health.js`**\n- [ ] **15. Convert `tests/health/health.js` to `tests/health/health.test.ts`**\n    - Action: Rename the test file and update it for TypeScript.\n\n**Phase 3: Verification & Documentation**\n\n- [ ] **16. Build the project**\n    - Action: Run `npm run build`.\n- [ ] **17. Run tests**\n    - Action: Execute `npm test` to ensure the Health API tests (and all other tests) pass.\n- [ ] **18. Update Memory Bank**\n    - Action: Document the new TypeScript setup and Health API conversion in `memory-bank/techContext.md`, and update `memory-bank/activeContext.md` and `memory-bank/progress.md`.\n\n<!--\n{ \"plan\": [ { \"id\": 1, ... self-reference removed ... } ] }\n-->"
      },
      "success_criteria": "File 'memory-bank/plans/2025-05-23-typescript-health-api-pilot.md' is created with the plan content.",
      "status": "pending"
    },
    {
      "id": 2, "description": "Install TypeScript and related dependencies", "tool": "execute_command", "args": { "command": "npm install --save-dev typescript ts-node ts-jest @types/node @types/express @types/jest @types/supertest @types/pg @types/cors @types/multer", "requires_approval": true }, "success_criteria": "Dependencies installed.", "status": "pending"
    },
    {
      "id": 3, "description": "Create tsconfig.json", "tool": "write_to_file", "args": { "path": "tsconfig.json", "content": "{\n  \"compilerOptions\": {\n    \"target\": \"es2020\",\n    \"module\": \"commonjs\",\n    \"lib\": [\"es2020\"],\n    \"allowJs\": true,\n    \"checkJs\": false,\n    \"outDir\": \"./dist\",\n    \"rootDir\": \"./src\",\n    \"strict\": true,\n    \"esModuleInterop\": true,\n    \"skipLibCheck\": true,\n    \"forceConsistentCasingInFileNames\": true,\n    \"resolveJsonModule\": true,\n    \"sourceMap\": true\n  },\n  \"include\": [\n    \"src/**/*\",\n    \"tests/**/*\"\n  ],\n  \"exclude\": [\n    \"node_modules\",\n    \"dist\"\n  ]\n}" }, "success_criteria": "tsconfig.json created.", "status": "pending"
    },
    {
      "id": 4, "description": "Update package.json scripts", "tool": "replace_in_file", "args": { "path": "package.json", "diff": "<<<<<<< SEARCH\n  \"scripts\": {\n    \"start\": \"node src/server.js\",\n    \"start:consumer\": \"node src/recon-engine-runner.js\",\n    \"test\": \"cross-env NODE_ENV=test jest --detectOpenHandles\",\n    \"db:reset\": \"npx prisma migrate reset\"\n  },\n=======        \n  \"scripts\": {\n    \"start\": \"node dist/server.js\",\n    \"start:consumer\": \"node dist/recon-engine-runner.js\",\n    \"build\": \"tsc\",\n    \"dev\": \"nodemon --watch src --ext js,ts --exec ts-node src/server.ts\",\n    \"test\": \"cross-env NODE_ENV=test jest --detectOpenHandles\",\n    \"db:reset\": \"npx prisma migrate reset\"\n  },\n>>>>>>> REPLACE" }, "success_criteria": "package.json scripts updated.", "status": "pending"
    },
    {
      "id": 5, "description": "Update jest.config.js", "tool": "replace_in_file", "args": { "path": "jest.config.js", "diff": "<<<<<<< SEARCH\nmodule.exports = {\n  testEnvironment: 'node',\n=======        \nmodule.exports = {\n  preset: 'ts-jest',\n  testEnvironment: 'node',\n>>>>>>> REPLACE\n\n<<<<<<< SEARCH\n  testMatch: [\n    '**/tests/**/*.js', // Matches our convention like tests/merchants/merchants.js\n    // Default Jest patterns can be included if needed for other conventions:\n    // '**/__tests__/**/*.[jt]s?(x)',\n    // '**/?(*.)+(spec|test).[tj]s?(x)',\n  ],\n=======\n  testMatch: [\n    '**/tests/**/*.[jt]s?(x)' // Matches .js, .jsx, .ts, .tsx files in tests directory\n  ],\n  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node'],\n>>>>>>> REPLACE\n\n<<<<<<< SEARCH\n  collectCoverageFrom: [\n    'src/**/*.js', // Collect coverage from all .js files in src\n    '!src/server.js', // Exclude server startup file\n=======\n  collectCoverageFrom: [\n    'src/**/*.[jt]s', // Collect coverage from all .js and .ts files in src\n    '!src/server.ts', // Exclude server startup file (future proof for .ts)\n    '!src/server.js',\n>>>>>>> REPLACE" }, "success_criteria": "jest.config.js updated.", "status": "pending"
    },
    {
      "id": 6, "description": "Read existing .gitignore content", "tool": "read_file", "args": { "path": ".gitignore" }, "success_criteria": "Read .gitignore content.", "status": "pending"
    },
    {
      "id": 7, "description": "Update .gitignore", "tool": "write_to_file", "args": { "path": ".gitignore", "content": "..." }, "success_criteria": ".gitignore updated.", "status": "pending"
    },
    {
      "id": 8, "description": "Read src/server/core/health.js", "tool": "read_file", "args": { "path": "src/server/core/health.js" }, "success_criteria": "Read core health.js.", "status": "pending"
    },
    {
      "id": 9, "description": "Convert src/server/core/health.js to src/server/core/health.ts", "tool": "write_to_file", "args": { "path": "src/server/core/health.ts", "content": "..." }, "success_criteria": "Core health.ts created.", "status": "pending"
    },
    {
      "id": 10, "description": "Read src/server/routes/health.js", "tool": "read_file", "args": { "path": "src/server/routes/health.js" }, "success_criteria": "Read routes health.js.", "status": "pending"
    },
    {
      "id": 11, "description": "Convert src/server/routes/health.js to src/server/routes/health.ts", "tool": "write_to_file", "args": { "path": "src/server/routes/health.ts", "content": "..." }, "success_criteria": "Routes health.ts created.", "status": "pending"
    },
    {
      "id": 12, "description": "Read src/server/routes/index.js", "tool": "read_file", "args": { "path": "src/server/routes/index.js" }, "success_criteria": "Read routes index.js.", "status": "pending"
    },
    {
      "id": 13, "description": "Update src/server/routes/index.js", "tool": "replace_in_file", "args": { "path": "src/server/routes/index.js", "diff": "..." }, "success_criteria": "Routes index.js updated.", "status": "pending"
    },
    {
      "id": 14, "description": "Read tests/health/health.js", "tool": "read_file", "args": { "path": "tests/health/health.js" }, "success_criteria": "Read health test file.", "status": "pending"
    },
    {
      "id": 15, "description": "Convert tests/health/health.js to tests/health/health.test.ts", "tool": "write_to_file", "args": { "path": "tests/health/health.test.ts", "content": "..." }, "success_criteria": "Health test file converted.", "status": "pending"
    },
    {
      "id": 16, "description": "Build the project", "tool": "execute_command", "args": { "command": "npm run build", "requires_approval": false }, "success_criteria": "Project builds successfully.", "status": "pending"
    },
    {
      "id": 17, "description": "Run tests", "tool": "execute_command", "args": { "command": "npm test", "requires_approval": false }, "success_criteria": "Tests pass.", "status": "pending"
    },
    {
      "id": 18, "description": "Update Memory Bank", "tool": "write_to_file", "args": { "path": "memory-bank/techContext.md", "content": "..." }, "success_criteria": "Memory Bank updated.", "status": "pending"
    }
  ]
}
-->
