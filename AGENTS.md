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
- Treat `openspec/changes/archive/` as historical records, not as the source of truth for current runtime behavior. Statements about authentication, infrastructure and development mocks describe the state at the time of the archived change unless explicitly verified against the current code and configuration.
- When an approved task requires correcting historical documentation, preserve the historical context by stating when the documented behavior applied rather than silently rewriting history.

## API integration
- The Go HTTP API is the browser's only backend boundary.
- Never call PostgreSQL or Java gRPC services from the browser.
- Never invent endpoints, response fields or error formats.
- Use `api/docs/swagger.yaml` as the API contract input.
- Inspect handlers and middleware when the contract is incomplete.
- Preserve exact HTTP methods, paths, payloads and status codes.
- Handle binary image bodies and 204 responses correctly.

## Authentication architecture
- The default Docker Compose stack uses the real Java authentication service. The Go HTTP API is its gRPC client; the browser communicates only with the Go HTTP API.
- In Docker Compose, the Go API connects to the `auth` service on internal port `50051` via `AUTH_GRPC_HOST` and `AUTH_GRPC_PORT`.
- The default runtime uses the real authentication client, not `mockAuthModule` or `MockModule`. Do not assume that mock authentication is enabled or that mock tokens are accepted by the live stack.
- Any retained mock authentication module is an explicit alternative for approved local development or testing. Never enable it silently or use it as a substitute for verifying the real authentication flow.
- Keep tests that target `mockAuthModule` isolated from database and HTTP-server initialization unless the test explicitly requires that infrastructure.
- Do not remove `mockAuthModule` or `MockModule` solely because the default application composition uses `Module`. Preserve the mock composition unless an explicitly approved task requires removing it. Do not switch the default application composition to `MockModule` without approval.

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