## Plan: Memory Bank Refactoring

| Done | # | Action                                                                  | Detail                                                                                                                               |
| :--- | :-: | :---------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| [ ]  | 1 | Create `entities` directory                                             | Create `memory-bank/entities/` for entity-specific files.                                                                            |
| [ ]  | 2 | Create initial `index.md`                                               | Create `memory-bank/index.md` as a placeholder.                                                                                      |
| [ ]  | 3 | Refactor `productContext.md`                                            | Rewrite `memory-bank/productContext.md` to keep general content. Entity-specific content will be moved.                              |
| [ ]  | 4 | Refactor `systemPatterns.md`                                            | Rewrite `memory-bank/systemPatterns.md` to keep general content. Entity-specific content will be moved.                              |
| [ ]  | 5 | Create `entities/merchants.md`                                          | Create `memory-bank/entities/merchants.md` with collated merchant-specific content from `productContext.md` and `systemPatterns.md`. |
| [ ]  | 6 | Create `entities/accounts.md`                                           | Create `memory-bank/entities/accounts.md` with collated account-specific content from `productContext.md` and `systemPatterns.md`.   |
| [ ]  | 7 | Finalize `index.md`                                                     | Update `memory-bank/index.md` with the full structure, descriptions, and links to all Memory Bank files.                             |
| [ ]  | 8 | Update `activeContext.md`                                               | Reflect the Memory Bank refactoring and current status in `memory-bank/activeContext.md`.                                            |
| [ ]  | 9 | Update `progress.md`                                                    | Log the completion of this Memory Bank refactoring task in `memory-bank/progress.md`.                                                |

<!--
{
  "planName": "Memory Bank Refactoring",
  "filePath": "memory-bank/plans/2025-05-19-memory-bank-refactor.md",
  "steps": [
    {
      "id": 1,
      "action": "Create `entities` directory",
      "tool": "write_to_file",
      "args": {
        "path": "memory-bank/entities/.keep",
        "content": ""
      },
      "success_criteria": "Directory `memory-bank/entities/` exists.",
      "status": "pending"
    },
    {
      "id": 2,
      "action": "Create initial `index.md`",
      "tool": "write_to_file",
      "args": {
        "path": "memory-bank/index.md",
        "content": "# Main Memory Bank Index\n\nThis is a placeholder and will be updated with the full structure later."
      },
      "success_criteria": "File `memory-bank/index.md` created with placeholder content.",
      "status": "pending"
    },
    {
      "id": 3,
      "action": "Refactor `productContext.md`",
      "tool": "write_to_file",
      "args": {
        "path": "memory-bank/productContext.md",
        "content": "<content_for_productContext_general_only>"
      },
      "success_criteria": "`productContext.md` updated with general content.",
      "status": "pending"
    },
    {
      "id": 4,
      "action": "Refactor `systemPatterns.md`",
      "tool": "write_to_file",
      "args": {
        "path": "memory-bank/systemPatterns.md",
        "content": "<content_for_systemPatterns_general_only>"
      },
      "success_criteria": "`systemPatterns.md` updated with general content.",
      "status": "pending"
    },
    {
      "id": 5,
      "action": "Create `entities/merchants.md`",
      "tool": "write_to_file",
      "args": {
        "path": "memory-bank/entities/merchants.md",
        "content": "<collated_merchant_specific_content>"
      },
      "success_criteria": "`entities/merchants.md` created with merchant-specific content.",
      "status": "pending"
    },
    {
      "id": 6,
      "action": "Create `entities/accounts.md`",
      "tool": "write_to_file",
      "args": {
        "path": "memory-bank/entities/accounts.md",
        "content": "<collated_account_specific_content>"
      },
      "success_criteria": "`entities/accounts.md` created with account-specific content.",
      "status": "pending"
    },
    {
      "id": 7,
      "action": "Finalize `index.md`",
      "tool": "write_to_file",
      "args": {
        "path": "memory-bank/index.md",
        "content": "<final_index_md_content_with_links_and_structure>"
      },
      "success_criteria": "`index.md` updated with final content and links.",
      "status": "pending"
    },
    {
      "id": 8,
      "action": "Update `activeContext.md`",
      "tool": "write_to_file",
      "args": {
        "path": "memory-bank/activeContext.md",
        "content": "<updated_activeContext_content_reflecting_refactor>"
      },
      "success_criteria": "`activeContext.md` updated.",
      "status": "pending"
    },
    {
      "id": 9,
      "action": "Update `progress.md`",
      "tool": "write_to_file",
      "args": {
        "path": "memory-bank/progress.md",
        "content": "<updated_progress_md_with_new_entry_for_refactor>"
      },
      "success_criteria": "`progress.md` updated with new log entry.",
      "status": "pending"
    }
  ]
}
-->
