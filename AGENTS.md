# Repository Instructions

## Repository boundaries
- `api/` contains the existing Go HTTP API.
- `grpc/` contains the shared authentication protocol.
- `nginx/` and `docker-compose.yml` define the local runtime.
- `frontend/` is the React + TypeScript application.
- `tools/` contains development-only tools and MCP servers.
- Treat existing Go and Java code as read-only unless explicitly approved.

## Before changing code
- Inspect repository status and relevant files.
- Read applicable OpenSpec specs and active change artifacts.
- Inspect the real API contract before implementing integration.
- Reuse the existing architecture instead of rebuilding it.
- Avoid unrelated edits and broad refactoring.

## OpenSpec
- Use OpenSpec for features and meaningful behavior changes.
- Review proposal, design, specifications and tasks before applying.
- Treat acceptance criteria as requirements, not optional suggestions.
- Update the specifications if approved behavior changes.
- Do not silently expand the scope of a change.

## API integration
- The Go HTTP API is the browser's only backend boundary.
- Never call PostgreSQL or Java gRPC services from the browser.
- Never invent endpoints, response fields or error formats.
- Use `api/docs/swagger.yaml` as the API contract input.
- Inspect handlers and middleware when the contract is incomplete.
- Preserve exact HTTP methods, paths, payloads and status codes.
- Handle binary image bodies and 204 responses correctly.

## Safety
- Never expose API keys, passwords, JWTs or database credentials.
- Do not print `.env` files or credential values into the conversation.
- Do not weaken backend authentication or authorization.
- Development mocks must be explicitly opt-in and local-only.
- Do not modify Go or Java behavior without prior approval.

## Quality
- Run the relevant type checker, linter, tests and production build.
- Test observable behavior, not implementation details.
- Report commands actually executed and their results.
- Never claim checks passed if they were not run.
- Distinguish automated coverage from manual verification.