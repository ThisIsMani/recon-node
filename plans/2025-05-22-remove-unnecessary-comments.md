# Plan: Remove Unnecessary Comments

**Date:** 2025-05-22

**Objective:** Clean up the codebase by removing specific types of unnecessary comments, while preserving essential ones (TODOs, critical explanations, Swagger/JSDoc).

## Comment Removal Criteria:

*   **Keep:**
    *   `TODO` / `FIXME` comments.
    *   Explanatory comments for genuinely complex or non-obvious logic.
    *   All JSDoc / Swagger comments (typically starting with `/** @swagger` or `/**` in route files, or `/** ... */` for multi-line JSDoc).
*   **Remove:**
    *   Commented-out code (lines starting with `//` followed by what looks like code).
    *   Obvious comments (e.g., `// increment i` for `i++`).
    *   License headers or boilerplate comments at the top of files (if any are found that are not standard package headers or essential file-level documentation).
    *   Any other single-line (`//`) or multi-line (`/* ... */`) comments that don't fall into the "Keep" categories.

## Steps

| Done | # | Action | Detail |
|------|---|--------|--------|
| [ ]  | 1 | Search for all comment types | Use `search_files` in `src/` and `tests/` for `(//.*|/\*[\s\S]*?\*/)` in `*.js` files. |
| [ ]  | 2 | Process files one by one | For each file found in step 1: Read file, identify unnecessary comments based on criteria, use `replace_in_file` to remove them. This will be an iterative process. |
| [ ]  | 3 | Run tests | Execute `npm test` to ensure no regressions. |
| [ ]  | 4 | Update Memory Bank | Update `activeContext.md` and `progress.md`. |

<!--
{
  "plan": [
    {
      "id": 1,
      "tool": "search_files",
      "args": {
        "path": "./",
        "regex": "(//.*|/\\*[\\s\\S]*?\\*/)",
        "file_pattern": "*.js"
      },
      "status": "pending",
      "notes": "Search for all comments in all JS files. Path './' covers src and tests."
    },
    {
      "id": 2,
      "tool": "replace_in_file",
      "args_template": {
        "path": "FILE_PATH_HERE",
        "diff": "MULTIPLE_SEARCH_REPLACE_BLOCKS_FOR_COMMENTS_HERE"
      },
      "status": "pending",
      "notes": "This step will be repeated for each file. Each call will require careful construction of SEARCH/REPLACE blocks to target only unnecessary comments, preserving JSDoc, TODOs, and essential explanations. This will be a highly iterative step, likely involving multiple replace_in_file calls per source file if many comments are present."
    },
    {
      "id": 3,
      "tool": "execute_command",
      "args": {
        "command": "npm test",
        "requires_approval": false
      },
      "status": "pending",
      "notes": "Run automated tests after all comment removal."
    },
    {
      "id": 4,
      "tool": "write_to_file",
      "args_template": {
        "path": "memory-bank/activeContext.md",
        "content": "UPDATED_CONTENT_FOR_COMMENT_REMOVAL_TASK"
      },
      "status": "pending",
      "notes": "Update activeContext.md. This will be followed by updating progress.md"
    }
  ]
}
-->
