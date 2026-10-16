---
name: openspec-audit
description: Audit an OpenSpec change for structural validity, API contract accuracy, requirement coverage, architectural consistency, task quality, and implementation readiness. Read-only; never modify files.
---

# OpenSpec Audit

## Purpose

Perform a rigorous, read-only audit of an existing OpenSpec change before implementation.

The goal is to determine whether the proposal, design, specifications, and tasks are internally consistent, grounded in the actual repository, and ready for implementation.

Do not treat successful OpenSpec validation as proof that the change is correct.

## Mandatory rules

1. Read the actual files. Never rely exclusively on summaries, previous agent reports, or claimed results.
2. Do not modify, create, delete, or reformat files.
3. Do not implement application code or automatically repair findings.
4. Do not invent API endpoints, DTO fields, dependencies, requirements, or repository structure.
5. Clearly distinguish confirmed facts from assumptions and recommendations.
6. Do not report a check as successful unless it was actually executed.
7. Inspect the current Git working tree before starting and preserve all existing user changes.
8. Keep the audit limited to the specified change and directly relevant repository sources.
9. Do not browse the web when the required evidence is available in the repository.
10. Do not expand the scope of the feature while reviewing it.

## Step 1: Identify the target change

Accept the change identifier from the user or invoking command.

Validate that the identifier exists under `openspec/changes/`.

If no identifier was provided:
- Run `openspec list`.
- Continue only if exactly one active change can be identified unambiguously.
- Otherwise report the available candidates and request an explicit identifier.

Do not assume that the most recently modified directory is the intended change.

## Step 2: Inspect repository context

Read, when present and relevant:

- Root `AGENTS.md`.
- Feature-specific `AGENTS.md`.
- `openspec/config.yaml`.
- The target change's `proposal.md`.
- The target change's `design.md`.
- The target change's `tasks.md`.
- All delta specification files belonging to the change.
- The change metadata file, if present.
- Existing base specifications relevant to the change.
- Actual dependency manifests and configuration files.
- The authoritative API contract, source code, and generated artifacts relevant to the feature.

Use the directory structure and schema configured in the repository. Do not assume that paths described in previous reports are correct.

For API-related changes, inspect the actual configured source of truth. In this repository, investigate `api/docs/swagger.yaml`, `api/docs/swagger.json`, and `frontend/src/shared/api/generated/schema.d.ts` when relevant. If these files disagree, report the disagreement instead of silently treating them as synchronized.

## Step 3: Validate OpenSpec structure

Run:

`openspec validate <change-id> --strict`

Also run:

`openspec list`

Use only CLI commands supported by the installed version.

Check:

- The proposal's declared capabilities match the delta specifications.
- Specification paths follow the active OpenSpec schema.
- Requirement headings and scenarios follow the expected schema format.
- Every requirement describes observable behavior.
- Scenarios define meaningful preconditions, actions, and outcomes.
- Requirements are sufficiently specific to be tested.
- Design decisions do not contradict the requirements.
- Tasks implement the approved scope.
- No unrelated base specifications, changes, or archived changes were accidentally modified.

Report validation output faithfully. If a command fails or is unavailable, say so.

## Step 4: Audit API contract accuracy

When the change interacts with an API, verify every relevant endpoint and payload against the authoritative source.

Check:

- HTTP methods and paths.
- Required and optional request fields.
- Response structure and optional fields.
- Query parameters, constraints, and defaults.
- Authentication headers and authorization requirements.
- HTTP success and error statuses.
- Binary request/response handling.
- Empty responses such as 204 No Content.
- Consistency of generated types with the actual API schema.

Never infer a contract from endpoint names or examples alone.

For the ShopAPI project, remember:

- The Go REST API is the browser-facing boundary.
- Swagger is the API contract source; verify which Swagger artifact is authoritative if YAML and JSON disagree.
- Browser code must not call the internal Java gRPC service directly.
- The existence of an endpoint in an old report does not prove that it exists now.

## Step 5: Audit design and dependencies

Compare `design.md` with actual source code, package manifests, and configuration.

Check:

- Dependencies proposed by the design are actually installed or explicitly included in tasks.
- The design does not assume features from missing packages.
- Existing components and architecture are reused where reasonable.
- No unnecessary abstractions, frameworks, state-management libraries, or services are introduced.
- The implementation plan does not duplicate existing functionality.
- Security trade-offs are described accurately.
- Production behavior is not dependent on test mocks.
- Environmental limitations are not presented as verified functionality.

For authentication, verify:

- The token is handled according to the documented contract.
- Optional response fields are treated as optional.
- Missing or empty tokens do not create an authenticated session.
- A 401 from protected requests clears the session when required.
- A public login error does not inadvertently trigger global logout behavior.
- Logout clears both the stored token and relevant cached user data.
- No unsupported JWT claims, refresh-token behavior, roles, or permissions are invented.

## Step 6: Audit task completeness and quality

Read the entire `tasks.md`. Do not rely on a short excerpt.

Check:

- Every specification requirement is covered by one or more tasks.
- Tasks have clear and verifiable completion criteria.
- Dependencies and execution order are sensible.
- Implementation precedes final verification.
- Tests are created before or alongside the functionality they verify.
- No tasks duplicate other tasks.
- No placeholder or skeleton tasks add work without delivering functionality.
- Documentation tasks have a concrete purpose.
- The total task count is consistent with the checkboxes in the file and, where applicable, OpenSpec's reported count.
- Test setup and tooling are included when needed.

Do not impose an arbitrary task count. Recommend consolidation only when it preserves traceability, clarity, and verification.

Do not recommend coverage percentages unless the project has an established, justified coverage target.

## Step 7: Run read-only checks

Run the applicable validation commands and inspect their outputs.

At minimum, where available:

- `openspec validate <change-id> --strict`
- `openspec list`
- `git status --short`
- `git diff --check`

Do not run commands that change files, install dependencies, regenerate artifacts, or start implementation.

If task-count discrepancies exist, compare the actual checkbox count against the reported OpenSpec count. Explain any discrepancy rather than guessing.

## Step 8: Report findings

Produce the audit in Russian.

Use these sections:

### BLOCKER
Problems that make implementation unsafe, contradictory, or impossible to verify.

### MAJOR
Important correctness, scope, architecture, security, or test-coverage problems that should be resolved before implementation.

### MINOR
Optional improvements that do not prevent implementation.

For every finding provide:

- A unique finding ID, such as `OS-001`.
- Severity.
- Exact file path and requirement/task heading.
- Evidence from the actual file or command output.
- Why it matters.
- A specific recommended correction.

Do not invent line numbers. Use headings when line ranges cannot be determined reliably.

### Requirement coverage

Show whether each capability and significant requirement is covered by tasks.

### Validation results

List the actual commands executed and their actual outcomes.

### Verdict

Choose exactly one:

- `APPROVE` — no outstanding blockers or major findings.
- `NEEDS REVISION` — blockers or major findings remain.

A passing CLI validation alone cannot justify `APPROVE`.

Finish with a concise list of concrete next actions. Do not make any changes yourself.