---
name: frontend-api-integration
description: Implements frontend API integration using the actual Go HTTP contract and generated TypeScript types.
compatibility: opencode
---

# Frontend API Integration

Before implementation, read `api/docs/swagger.yaml`,
the generated OpenAPI/types and the corresponding Go handlers.

Never invent endpoints or silently change the backend contract.

Keep requests in the shared API layer or feature API modules.
Reuse the common HTTP client, authentication handling and errors.

Preserve exact:
- HTTP method and path;
- request and response fields;
- query parameters;
- status codes;
- binary body handling;
- authorization requirements.

Handle HTTP 204 responses without calling response.json().
Handle non-2xx fetch responses explicitly.
Do not treat TypeScript types as runtime validation.

If OpenAPI conflicts with the actual handler, stop and report
the discrepancy instead of silently choosing one.

Add deterministic tests for the API client and UI behavior.