## Brief overview
This rule outlines the policy for ensuring adequate test coverage when new features are added or existing code is refactored. This is a global rule.

## Test Coverage for Features and Refactoring
- When a new feature is implemented, corresponding automated tests (unit, integration, or API tests as appropriate) **must be created** to cover its functionality.
- When existing code is refactored or significantly modified, existing tests **must be updated** to reflect the changes, and new tests **should be added** if the refactoring exposes new testable units or behaviors.
- The goal is to maintain or improve test coverage with each change.
- These tests should be included in the same task/commit as the feature or refactoring work.
