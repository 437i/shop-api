---
name: frontend-testing
description: Creates and debugs deterministic React unit, component and end-to-end tests.
compatibility: opencode
---

# Frontend Testing

## Before writing tests

1. Read the relevant source code and OpenSpec scenarios.
2. Inspect existing test files and package scripts.
3. Use the project's installed testing tools.
4. Do not introduce another testing framework.

## Testing strategy

- Use Vitest for unit tests.
- Use React Testing Library for observable component behavior.
- Use user-event for realistic user interactions.
- Use Playwright for browser-level user scenarios.
- Isolate unit/component tests from the running backend.
- Use the real local Go API for explicitly designated integration tests.

## Required coverage

For data-driven UI, cover applicable cases:
- loading state;
- successful response;
- empty response;
- API failure and retry;
- authorization errors;
- user interaction and visible result.

For forms, cover:
- required fields and invalid input;
- successful submission;
- server-side validation errors;
- pending/disabled state;
- success and failure feedback.

## Quality rules

- Prefer queries by accessible role and name.
- Test behavior instead of private component state.
- Do not use arbitrary sleeps or fragile timing assumptions.
- Never weaken a test simply to make broken code pass.
- Do not claim browser verification when only unit tests ran.

## Report
List tests added, scenarios covered, commands executed,
actual results and all remaining verification gaps.