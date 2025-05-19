## Brief overview
This rule outlines the preferred method for testing backend changes, particularly for API endpoints.

## Testing Server Changes
- After making any changes to server files (e.g., routes, core logic, services), the server should be restarted to ensure the changes are loaded.
- API endpoints should be tested to verify their functionality.

## API Testing Method
- `curl` commands are the preferred method for testing API endpoints.
- Tests should cover:
    - Successful creation of resources (e.g., `POST` requests).
    - Retrieval of resources (e.g., `GET` requests).
    - Expected error handling (e.g., duplicate creations, invalid input).
- When asking the user to test, provide specific `curl` command examples.
