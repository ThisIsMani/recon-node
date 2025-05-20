# Main Memory Bank Index: Smart Ledger Backend (Node.js)

This Memory Bank documents the Smart Ledger Backend project, including its objectives, technical details, system architecture, and ongoing progress.

## Core Documents

- **[Project Brief (`projectbrief.md`)](./projectbrief.md):** Outlines the main objectives, core functionality, and scope of the Smart Ledger project.
- **[Product Context (`productContext.md`)](./productContext.md):** Describes the user problems, target users, and general UX expectations for the API.
- **[System Patterns (`systemPatterns.md`)](./systemPatterns.md):** Details the overall architecture, modularity, general data flow, and key design patterns used in the system.
- **[Technical Context (`techContext.md`)](./techContext.md):** Specifies the runtime environment, key technologies, Node.js packages, development tools, and technical constraints.

## Entities

Detailed information about specific business entities, their data models, API endpoints, core logic, and user stories are documented in the `entities/` subdirectory.

- **[Merchants (`entities/merchants.md`)](./entities/merchants.md):** Information related to Merchant accounts.
- **[Accounts (`entities/accounts.md`)](./entities/accounts.md):** Information related to financial Accounts associated with Merchants.
- **[Recon Rules (`entities/recon-rules.md`)](./entities/recon-rules.md):** Information related to Reconciliation Rules.
- **[Staging Entries (`entities/staging-entries.md`)](./entities/staging-entries.md):** Information related to Staging Entries.
- **[Entries (`entities/entries.md`)](./entities/entries.md):** Information related to final Ledger Entries.
- **[Transactions (`entities/transactions.md`)](./entities/transactions.md):** Information related to financial Transactions grouping Entries.
- **[Process Tracker (`entities/process-tracker.md`)](./entities/process-tracker.md):** Information related to the task management system for the Recon Engine.
- **[Recon Engine (`entities/recon-engine.md`)](./entities/recon-engine.md):** Information related to the core reconciliation engine component.
- *(Future entities will be added here as they are developed.)*

## Operational Documents

- **[Active Context (`activeContext.md`)](./activeContext.md):** Captures the current focus of development, key decisions from recent tasks, high-level next steps, and open questions. This file is updated frequently.
- **[Progress Log (`progress.md`)](./progress.md):** A chronological log of major tasks undertaken, their status, challenges, and outcomes.
- **[Plans (`plans/`)](./plans/):** Contains detailed, step-by-step plans for specific development tasks or features.
    - Example: `plans/2025-05-19-api-tests.md`
    - Example: `plans/2025-05-19-memory-bank-refactor.md`

## Cline Custom Instructions & Rules

- **Root `.clinerules/` directory:** Contains project-specific development guidelines and conventions that I (Cline) adhere to. These are not part of the Memory Bank itself but influence how I operate on this project.
    - `development-server-workflow.md`
    - `entity-folder-structure.md`
    - `file-naming-conventions.md`
    - `testing-preferences.md`

---

*This Memory Bank is maintained by Cline, your AI software engineer, to ensure continuity and context across development sessions.*
*Last Refreshed: 2025-05-20*
