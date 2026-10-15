# Frontend Instructions

## Stack
- React + TypeScript + Vite.
- Use strict TypeScript; avoid `any`.
- React Router for navigation.
- TanStack Query for server state.
- Tailwind CSS and shadcn/ui for the interface.
- i18next and react-i18next for English and Russian.
- Vitest, Testing Library and Playwright for testing.

## Architecture
- Keep pages, features, shared API code and UI components separate.
- Keep HTTP requests in the shared API layer or feature API modules.
- Use React state for local UI state.
- Do not duplicate TanStack Query server state in another store.
- Avoid unnecessary abstractions and dependencies.

## API
- Treat generated API types as generated files.
- Regenerate types from the source contract rather than editing them.
- Use one consistent HTTP client and error handling strategy.
- Handle loading, empty, error, success and disabled states.
- Remember that HTTP 204 responses have no JSON body.
- Upload images as application/octet-stream.
- Never call Java gRPC endpoints from the browser.

## UI
- The default UI language is English; Russian must be supported.
- Use consistent spacing, typography, colors and component variants.
- Ensure tables, forms, dialogs and navigation work on mobile.
- Use semantic HTML and accessible controls.
- Do not add features or metrics that the API cannot support.

## Tests
- Use Vitest and Testing Library for unit/component tests.
- Use Playwright for real browser scenarios.
- Mock API boundaries in isolated UI tests.
- Use the local backend for integration tests.
- Do not use arbitrary sleeps or nondeterministic assertions.