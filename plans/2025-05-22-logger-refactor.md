# Plan: Refactor Console Logs to Logger Service

**Date:** 2025-05-22

**Objective:** Replace all direct `console.log`, `console.error`, `console.warn`, `console.info`, and `console.debug` calls throughout the project with the centralized `logger` service (`src/services/logger.js`).

## Steps

| Done | # | Action | Detail |
|------|---|--------|--------|
| [ ]  | 1 | Search for `console.log` occurrences | Use `search_files` in `src/` and `tests/` for `console\.log\(` |
| [ ]  | 2 | Search for `console.error` occurrences | Use `search_files` in `src/` and `tests/` for `console\.error\(` |
| [ ]  | 3 | Search for `console.warn` occurrences | Use `search_files` in `src/` and `tests/` for `console\.warn\(` |
| [ ]  | 4 | Search for `console.info` occurrences | Use `search_files` in `src/` and `tests/` for `console\.info\(` |
| [ ]  | 5 | Search for `console.debug` occurrences | Use `search_files` in `src/` and `tests/` for `console\.debug\(` |
| [ ]  | 6 | Consolidate file list | Create a unique list of files needing modification from search results. |
| [ ]  | 7 | Refactor files | For each file: import logger, replace console calls with logger calls. |
| [ ]  | 8 | Run tests | Execute `npm test` to ensure no regressions. |
| [ ]  | 9 | Update Memory Bank | Update `activeContext.md` and `progress.md`. |

<!--
{
  "plan": [
    {
      "id": 1,
      "tool": "search_files",
      "args": {
        "path": "src/",
        "regex": "console\\.log\\(",
        "file_pattern": "*.js"
      },
      "status": "pending",
      "notes": "Search console.log in src"
    },
    {
      "id": 1.1,
      "tool": "search_files",
      "args": {
        "path": "tests/",
        "regex": "console\\.log\\(",
        "file_pattern": "*.js"
      },
      "status": "pending",
      "notes": "Search console.log in tests"
    },
    {
      "id": 2,
      "tool": "search_files",
      "args": {
        "path": "src/",
        "regex": "console\\.error\\(",
        "file_pattern": "*.js"
      },
      "status": "pending",
      "notes": "Search console.error in src"
    },
    {
      "id": 2.1,
      "tool": "search_files",
      "args": {
        "path": "tests/",
        "regex": "console\\.error\\(",
        "file_pattern": "*.js"
      },
      "status": "pending",
      "notes": "Search console.error in tests"
    },
    {
      "id": 3,
      "tool": "search_files",
      "args": {
        "path": "src/",
        "regex": "console\\.warn\\(",
        "file_pattern": "*.js"
      },
      "status": "pending",
      "notes": "Search console.warn in src"
    },
    {
      "id": 3.1,
      "tool": "search_files",
      "args": {
        "path": "tests/",
        "regex": "console\\.warn\\(",
        "file_pattern": "*.js"
      },
      "status": "pending",
      "notes": "Search console.warn in tests"
    },
    {
      "id": 4,
      "tool": "search_files",
      "args": {
        "path": "src/",
        "regex": "console\\.info\\(",
        "file_pattern": "*.js"
      },
      "status": "pending",
      "notes": "Search console.info in src"
    },
    {
      "id": 4.1,
      "tool": "search_files",
      "args": {
        "path": "tests/",
        "regex": "console\\.info\\(",
        "file_pattern": "*.js"
      },
      "status": "pending",
      "notes": "Search console.info in tests"
    },
    {
      "id": 5,
      "tool": "search_files",
      "args": {
        "path": "src/",
        "regex": "console\\.debug\\(",
        "file_pattern": "*.js"
      },
      "status": "pending",
      "notes": "Search console.debug in src"
    },
    {
      "id": 5.1,
      "tool": "search_files",
      "args": {
        "path": "tests/",
        "regex": "console\\.debug\\(",
        "file_pattern": "*.js"
      },
      "status": "pending",
      "notes": "Search console.debug in tests"
    },
    {
      "id": 6,
      "tool": "manual",
      "args": {},
      "status": "pending",
      "notes": "Consolidate search results into a unique list of files. This step will be done by me (Cline) based on the output of steps 1-5."
    },
    {
      "id": 7,
      "tool": "replace_in_file",
      "args_template": {
        "path": "FILE_PATH_HERE",
        "diff": "MULTIPLE_SEARCH_REPLACE_BLOCKS_HERE"
      },
      "status": "pending",
      "notes": "This step will be repeated for each file identified in step 6. Each replace_in_file will require adding logger import and replacing all console calls."
    },
    {
      "id": 8,
      "tool": "execute_command",
      "args": {
        "command": "npm test",
        "requires_approval": false
      },
      "status": "pending",
      "notes": "Run automated tests."
    },
    {
      "id": 9,
      "tool": "write_to_file",
      "args_template": {
        "path": "memory-bank/activeContext.md",
        "content": "UPDATED_CONTENT_HERE"
      },
      "status": "pending",
      "notes": "Update activeContext.md. This will be followed by updating progress.md"
    }
  ]
}
-->
