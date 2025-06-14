## Refactoring Plan: Type Standardization (Phase 1)

This phase focuses on establishing clear distinctions and locations for API models, Domain models, and Prisma models. This will improve clarity, maintainability, and prepare the codebase for further refactoring.

### P1.1: Setup & Strategy
*   [ ] **1.1.1: Define & Document Type Strategy:**
    *   Finalize and document the chosen locations for different types of models (Prisma, API, Domain).
    *   Current proposal:
        *   **Prisma Models:** Generated by Prisma in `node_modules/.prisma/client`. These are the source of truth for database interactions.
        *   **API Models:** To be located in `src/server/api_models/` (e.g., `src/server/api_models/merchant.types.ts`). These define the DTOs for HTTP request/response bodies.
        *   **Domain Models:** To be located in `src/server/domain_models/` (e.g., `src/server/domain_models/merchant.types.ts`). These represent core business entities and logic, independent of API or database specifics.
*   [ ] **1.1.2: Create directory `src/server/api_models/` for API-specific types.**
    *   Ensures the directory exists for placing API model files.
    *   *Adheres to: `file-naming-conventions.md` for files within.*
*   [ ] **1.1.3: Create directory `src/server/domain_models/` for core domain-specific types.**
    *   Ensures the directory exists for placing domain model files.
    *   *Adheres to: `file-naming-conventions.md` for files within.*

### P1.2: Merchant Entity Type Refactoring (Pilot Entity)
This will serve as a template for other entities.
*   [ ] **1.2.1: Analyze existing Merchant types and define new API models.**
    *   Review `prisma/schema.prisma` for `Merchant` model.
    *   Review `src/server/routes/merchant/index.ts` and `src/server/core/merchant/index.ts` for current type usage.
    *   Create `src/server/api_models/merchant.types.ts` with interfaces/types for Merchant API requests (e.g., `CreateMerchantRequest`, `UpdateMerchantRequest`) and responses (e.g., `MerchantResponse`).
*   [ ] **1.2.2: Define and create Domain models for Merchant.**
    *   Create `src/server/domain_models/merchant.types.ts` with the core `Merchant` domain interface/type, potentially differing from the Prisma model if business logic requires fields not directly in the DB or different representations.
*   [ ] **1.2.3: Refactor Merchant route handlers (`src/server/routes/merchant/index.ts`).**
    *   Update route handlers to use the new API models for request validation and response formatting.
    *   Implement transformation logic between API models and Domain/Prisma models.
*   [ ] **1.2.4: Refactor Merchant core logic (`src/server/core/merchant/index.ts`).**
    *   Update core functions to primarily use Domain models internally.
    *   Manage transformations to/from Prisma models at the database interaction boundary and to/from API models at the service layer boundary.
*   [ ] **1.2.5: Update Merchant tests.**
    *   Modify `tests/merchants/merchants.test.ts` (API tests) and `tests/merchants/core/merchants.test.ts` (core logic tests) to align with new type signatures and data structures.
    *   Ensure test coverage is maintained/improved.
    *   *Adheres to: `test-coverage-policy.md`.*

### P1.3: Account Entity Type Refactoring
Follow the pattern established with the Merchant entity.
*   [ ] **1.3.1: Define and create API models for Account in `src/server/api_models/account.types.ts`.**
*   [ ] **1.3.2: Define and create Domain models for Account in `src/server/domain_models/account.types.ts`.**
*   [ ] **1.3.3: Refactor Account route handlers (`src/server/routes/account/index.ts`) to use new API models.**
*   [ ] **1.3.4: Refactor Account core logic (`src/server/core/account/index.ts`) to use new Domain models.**
*   [ ] **1.3.5: Update Account tests (`tests/accounts/accounts.test.ts`) to reflect type changes.**
    *   *Adheres to: `test-coverage-policy.md`.*

### P1.4: Subsequent Entity Type Refactoring
Iteratively apply the same refactoring pattern to other key entities:
*   [ ] **Transaction Entity**
*   [ ] **Entry Entity**
*   [ ] **StagingEntry Entity**
*   [ ] **ReconRule Entity**
*   [ ] **ProcessTracker Entity**
    *(Each will involve creating API and Domain models, refactoring routes and core logic, and updating tests.)*

### P1.5: Recon Engine Types Refactoring
*   [ ] **1.5.1: Analyze types in `src/server/core/recon-engine/types/index.ts`.**
    *   Identify types that can be classified as API models or Domain models.
*   [ ] **1.5.2: Relocate and refactor Recon Engine types.**
    *   Move relevant types to `src/server/api_models/recon_engine.types.ts` or `src/server/domain_models/recon_engine.types.ts` (or entity-specific files like `staging_entry.types.ts` if more appropriate).
    *   Update all usages in `src/server/core/recon-engine/` and related test files.
*   [ ] **1.5.3: Update Recon Engine tests to reflect type changes.**
    *   Files like `tests/recon-engine/core/types.test.ts`, `consumer.test.ts`, `engine.test.ts`, etc.
    *   *Adheres to: `test-coverage-policy.md`.*

### P1.6: General Type Review & Cleanup
*   [ ] **1.6.1: Scan codebase for remaining inline types or types in incorrect locations.**
    *   Refactor these to use the newly established model locations.
*   [ ] **1.6.2: Ensure consistent usage of `Prisma.` namespace for Prisma-generated types.**

### P1.7: Finalization & Documentation (Phase 1)
*   [ ] **1.7.1: Run all automated tests.**
    *   Execute `npm test` to ensure all changes pass and no regressions were introduced.
    *   Address any failures before concluding the phase.
    *   *Adheres to: `test-execution-policy.md`.*
*   [ ] **1.7.2: Update code comments (JSDoc/TSDoc).**
    *   Ensure all new/modified types, functions, and modules are adequately documented.
*   [ ] **1.7.3: Update Memory Bank.**
    *   Update `memory-bank/systemPatterns.md` to reflect the finalized type organization.
    *   Update `memory-bank/activeContext.md` with the summary of Phase 1.
    *   Add an entry to `memory-bank/progress.md` for Phase 1 completion.
    *   Update relevant entity files in `memory-bank/entities/` if their data model representations have significantly changed.
    *   *Adheres to: `memory-bank-interaction.md`.*

---
<!--
{
  "planFile": "memory-bank/plans/2025-05-23-type-standardization-refactor-plan.md",
  "phases": [
    {
      "name": "Phase 1: Type Standardization",
      "steps": [
        {
          "id": "1.1.1",
          "description": "Define & Document Type Strategy (Conceptual, documentation update in Memory Bank)",
          "tool": "comment",
          "status": "pending"
        },
        {
          "id": "1.1.2",
          "description": "Create directory src/server/api_models/",
          "tool": "write_to_file",
          "args": {"path": "src/server/api_models/.gitkeep", "content": ""},
          "success_condition": "directory_exists",
          "status": "pending",
          "policies": ["file-naming-conventions.md"]
        },
        {
          "id": "1.1.3",
          "description": "Create directory src/server/domain_models/",
          "tool": "write_to_file",
          "args": {"path": "src/server/domain_models/.gitkeep", "content": ""},
          "success_condition": "directory_exists",
          "status": "pending",
          "policies": ["file-naming-conventions.md"]
        },
        {
          "id": "1.2.1",
          "description": "Define and create API models for Merchant in src/server/api_models/merchant.types.ts",
          "tool": "write_to_file",
          "args": {"path": "src/server/api_models/merchant.types.ts", "content": "// Placeholder for Merchant API Models (Request/Response DTOs)\nexport interface CreateMerchantRequest {\n  name: string;\n  // ... other properties\n}\n\nexport interface MerchantResponse {\n  id: string;\n  name: string;\n  // ... other properties\n  created_at: Date;\n  updated_at: Date;\n}\n"},
          "success_condition": "file_exists_with_content",
          "status": "pending"
        },
        {
          "id": "1.2.2",
          "description": "Define and create Domain models for Merchant in src/server/domain_models/merchant.types.ts",
          "tool": "write_to_file",
          "args": {"path": "src/server/domain_models/merchant.types.ts", "content": "// Placeholder for Merchant Domain Model\nexport interface Merchant {\n  id: string;\n  name: string;\n  isActive: boolean;\n  // ... other core domain properties\n}\n"},
          "success_condition": "file_exists_with_content",
          "status": "pending"
        },
        {
          "id": "1.2.3",
          "description": "Refactor Merchant route handlers (src/server/routes/merchant/index.ts) to use new API models.",
          "tool": "replace_in_file",
          "args_template": {"path": "src/server/routes/merchant/index.ts", "diff": "..." },
          "status": "pending"
        },
        {
          "id": "1.2.4",
          "description": "Refactor Merchant core logic (src/server/core/merchant/index.ts) to use new Domain models.",
          "tool": "replace_in_file",
          "args_template": {"path": "src/server/core/merchant/index.ts", "diff": "..." },
          "status": "pending"
        },
        {
          "id": "1.2.5",
          "description": "Update Merchant tests (tests/merchants/*)",
          "tool": "replace_in_file",
          "args_template": {"path": "tests/merchants/merchants.test.ts", "diff": "..." },
          "status": "pending",
          "policies": ["test-coverage-policy.md"]
        },
        {
          "id": "1.7.1",
          "description": "Run all automated tests.",
          "tool": "execute_command",
          "args": {"command": "npm test", "requires_approval": false},
          "status": "pending",
          "policies": ["test-execution-policy.md"]
        },
        {
          "id": "1.7.3",
          "description": "Update Memory Bank (systemPatterns.md, activeContext.md, progress.md, entity files).",
          "tool": "comment",
          "status": "pending",
          "policies": ["memory-bank-interaction.md"]
        }
      ]
    }
  ]
}
-->
