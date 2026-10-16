---
name: openspec-repair
description: Repair confirmed issues in existing OpenSpec change artifacts while preserving approved scope, requirements, architecture, and traceability. Never implement application code.
---

# OpenSpec Repair

## Purpose

Repair an existing OpenSpec change based on concrete audit findings.

This skill edits OpenSpec artifacts only. It must not implement the application, modify backend code, or expand feature scope.

## Mandatory rules

1. Identify the target change explicitly or unambiguously.
2. Read the actual current files before making changes.
3. Read the project's `AGENTS.md`, relevant feature instructions, and `openspec/config.yaml`.
4. Inspect the current Git working tree and preserve unrelated user changes.
5. Use confirmed audit findings as the primary repair scope.
6. Verify findings against the current files. Do not blindly apply stale audit recommendations.
7. Do not invent requirements, endpoints, DTOs, dependencies, or architecture.
8. Do not modify application code, tests, API contracts, Docker, Nginx, database schemas, or migrations.
9. Do not update base specifications unless the user explicitly authorizes it and the correction genuinely requires it.
10. Never run `/opsx-apply`, implement application functionality, archive the change, or commit changes.
11. Do not claim that validation passed without executing it.
12. If a finding cannot be resolved without changing scope or making an unsupported decision, stop and report the issue.

## Step 1: Establish repair scope

Determine:

- The target change identifier.
- The audit findings to address.
- The files that each finding affects.
- Any explicit constraints provided by the user.

If the invoking command includes only a change identifier, inspect the most recent audit findings in the current conversation and verify the current files.

If no actionable findings are available, perform a read-only audit using the `openspec-audit` skill before modifying anything.

Do not treat every MINOR recommendation as mandatory. Prioritize confirmed defects and user-approved changes.

## Step 2: Inspect the current change

Read the relevant files in full:

- `proposal.md`
- `design.md`
- `tasks.md`
- All affected delta specifications.
- Change metadata, if present.
- `openspec/config.yaml`.
- Relevant base specifications.
- Actual source-of-truth API and configuration files when applicable.

Check for changes made since the audit. Reconcile the current state before editing.

## Step 3: Define a minimal repair plan

Before editing, produce a short plan containing:

- Finding IDs to fix.
- Files to modify.
- Intended correction for each finding.
- Requirements and scope that must remain unchanged.

Fix the smallest coherent set of files needed to resolve the findings.

Do not refactor unrelated artifacts or rewrite the entire change merely to improve wording.

## Step 4: Repair structural and semantic issues

### Proposal

Keep the objective, boundaries, capabilities, risks, and known limitations consistent with the actual feature.

Ensure declared capabilities match the delta specification directories.

### Specifications

- Preserve existing requirements unless a confirmed issue requires correction.
- Use the format expected by the configured OpenSpec schema.
- Describe observable behavior and testable outcomes.
- Add missing scenarios when a documented API contract requires them.
- Cover optional fields, error states, authorization behavior, and empty responses where relevant.
- Do not add endpoints, status codes, fields, or assumptions without evidence.

### Design

- Match actual installed dependencies and existing architecture.
- Explain the relevant technical decisions without introducing unnecessary abstractions.
- Reflect the corrected requirements and repository constraints.
- Keep implementation details out of behavioral requirements.
- Preserve documented security trade-offs and environmental limitations.

### Tasks

- Ensure every requirement is covered by tasks.
- Maintain clear dependencies and logical execution order.
- Consolidate duplicate tasks and empty skeleton tasks where practical.
- Retain tasks for necessary tests and verification.
- Keep documentation only when it serves a concrete user or maintenance need.
- Ensure the final task verifies actual checks rather than merely requesting documentation.
- Keep the task count consistent with the actual checkboxes and OpenSpec's reported count.

Do not optimize for an arbitrary number of tasks. Preserve traceability and useful granularity.

## Step 5: Preserve project boundaries

For the ShopAPI frontend change:

- Do not modify Go API or Java auth service code.
- Do not modify Swagger, database migrations, schema, Docker Compose, or Nginx.
- Do not add production mocks or fake users.
- Do not claim successful real authentication when the Java service is unavailable.
- Use real Swagger contracts as the source of API behavior.
- Ensure test mocks remain in the test layer.
- Do not invent JWT payload, refresh-token flows, roles, or permissions.

If a correction requires changing an excluded area, explain why and ask for authorization rather than implementing it.

## Step 6: Validate repairs

After edits, run:

`openspec validate <change-id> --strict`

Then run:

`openspec list`

Also inspect:

- `git diff --check`
- `git status --short`
- `git diff -- <changed OpenSpec artifact paths>`

Compare task counts with the actual checkboxes in `tasks.md` and OpenSpec output when available.

If validation fails, inspect the error and fix issues that are clearly within scope. Do not suppress validation errors or weaken schema requirements to force a passing result.

Do not run application implementation or application tests unless explicitly requested.

## Step 7: Report the result

Respond in Russian.

Summarize:

1. Findings fixed, identified by their audit IDs.
2. Files changed and the reason for each change.
3. Findings intentionally left unresolved, with explanations.
4. Actual validation commands and their outcomes.
5. Remaining risks or decisions requiring user input.

Include a concise diff summary.

Never claim the change is ready for implementation if blockers or major findings remain.

Use one of these final statuses:

- `REPAIRED — READY FOR RE-AUDIT`
- `PARTIALLY REPAIRED — REVIEW REQUIRED`
- `BLOCKED — USER DECISION REQUIRED`

A repair is not automatically approved. A separate read-only audit should confirm that the changes resolved the original findings without introducing regressions.