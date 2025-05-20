## Brief overview
This rule outlines how Cline should interact with the refactored Memory Bank for the Smart Ledger Backend project. It covers the expected structure, reading procedures, and update protocols to ensure consistent and effective use of this contextual knowledge base. This is a project-specific rule.

## Memory Bank Structure
- **Main Index (`memory-bank/index.md`):** This is the central navigation point. It contains links to all other Memory Bank documents and an overview of the structure.
- **Core Documents (`memory-bank/*.md`):**
    - `projectbrief.md`: Main objectives, core functionality, scope.
    - `productContext.md`: User problems, target users, general UX expectations.
    - `systemPatterns.md`: Overall architecture, modularity, general data flow, key design patterns.
    - `techContext.md`: Runtime environment, key technologies, packages, development tools, constraints.
- **Entities (`memory-bank/entities/`):** This directory holds markdown files for specific business entities (e.g., `merchants.md`, `accounts.md`). New entities (e.g., Entries, Transactions) should have their own files created here. Each entity file should detail its data model, API endpoints, core logic, relevant user stories, and specific data flows.
- **Operational Documents:**
    - `activeContext.md`: Captures current development focus, key decisions from recent tasks, high-level next steps, and open questions. Updated frequently.
    - `progress.md`: A chronological log of major tasks, their status, actions taken, challenges, and outcomes.
    - `plans/`: Contains detailed, step-by-step plans for specific development tasks or features.

## Reading the Memory Bank
- **Start with the Index:** Always begin by consulting `memory-bank/index.md` to understand the overall structure and find links to relevant documents.
- **Understand Foundations:** Refer to the Core Documents for foundational understanding of the project's goals, context, architecture, and technology stack.
- **Entity-Specific Details:** For information related to specific entities (like Merchants or Accounts), consult the corresponding file within the `memory-bank/entities/` directory.
- **Current State & History:** Review `activeContext.md` for the latest focus and `progress.md` for historical context and task evolution.
- **Task-Specific Plans:** If a task refers to a plan, consult the relevant file in the `plans/` directory.
- **Loading Protocol:** If `use_memory = true` (set at session start or by user command "load memory bank now"):
    - Initially, at the start of a task or when `use_memory` becomes true, proactively load and review high-level Memory Bank files. This includes `memory-bank/index.md`, `memory-bank/activeContext.md`, and the Core Documents (`projectbrief.md`, `productContext.md`, `systemPatterns.md`, `techContext.md`).
    - Other, more specific files (such as those in `memory-bank/entities/` or `memory-bank/plans/`) should be read on an as-needed basis to conserve context window, guided by the information in the initially loaded files or the user's task.

## Updating the Memory Bank
- **Post-Task Updates:** After completing significant tasks, making key decisions, or implementing substantial changes, update the relevant Memory Bank files.
- **`activeContext.md`:** Update with the current development focus, decisions made during the task, and agreed-upon next steps.
- **`progress.md`:** Add a new entry detailing the completed task, actions taken, final status, and any notable issues or learnings.
- **Entity Files (`memory-bank/entities/*.md`):**
    - Update existing entity files if their corresponding features, schemas, or APIs are modified.
    - Create new entity files when new business entities are introduced and developed.
- **Core Documents:** Update these less frequently, only if fundamental aspects of the project (scope, core architecture, primary tech) change significantly.
- **`index.md`:** Update if the overall structure of the Memory Bank itself changes (e.g., new top-level sections are added, or directories are reorganized). Ensure all links remain accurate.
- **User Prompts:** When the user says "remember X," "document Y," or similar, interpret this as a cue to update the Memory Bank. Clarify which file(s) should be updated if it's not immediately obvious.
- **"Update Memory Bank" Command:** If the user issues an explicit command like "update memory bank," conduct a thorough review of *all* Memory Bank files to ensure they are current and consistent.
- **Session End:** If `activeContext.md` or `progress.md` have been modified during the session, ensure these changes are saved.

## General Interaction
- **Context is Key:** The Memory Bank is the primary mechanism for maintaining context and knowledge across development sessions. Utilize it consistently.
- **Adhere to Structure:** When adding new information or documents, follow the established structure (e.g., new entity documentation goes into `memory-bank/entities/`).
- **Clarity on Updates:** If unsure about where or how to document a piece of information, ask the user for clarification.
