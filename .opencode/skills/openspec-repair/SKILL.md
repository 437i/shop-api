---
name: openspec-repair
description: Repair confirmed issues in any OpenSpec change while preserving its approved scope, requirements, design intent, traceability, and repository boundaries. Do not implement application functionality.
---

# OpenSpec Repair

## Purpose

Repair an existing OpenSpec change based on verified audit findings or specific corrections requested by the user.

This skill is repository-agnostic. Determine the project's configured OpenSpec workflow and work only with the artifacts belonging to the selected change.

The goal is the smallest coherent repair that resolves confirmed issues without expanding scope or introducing new contradictions.

## Mandatory rules

1. Identify the target change explicitly or unambiguously.
2. Read current files before editing. Do not blindly follow stale audit findings.
3. Read relevant project instructions and OpenSpec configuration.
4. Inspect the Git working tree and preserve unrelated user changes.
5. Treat audit findings as hypotheses to verify, not commands to apply blindly.
6. Do not invent requirements, behavior, APIs, dependencies, or architecture.
7. Modify only artifacts belonging to the target change.
8. Do not modify application source code, tests, generated code, API contracts, project-wide configuration, base specifications, or unrelated changes unless the user explicitly authorizes the specific modification.
9. Do not expand the approved scope to resolve a finding. If a correction requires a product, architectural, or scope decision, report the decision needed and do not guess.
10. Do not implement the application, run the workflow's apply phase, archive the change, create commits, or stage files.
11. Never claim validation or tests passed without executing them and observing the result.
12. If no confirmed in-scope issue exists, do not make cosmetic changes merely to produce a diff.
13. Follow applicable repository instructions.

## Step 1: Identify the target and findings

Determine:

- the target change identifier;
- the audit findings or requested corrections;
- any explicit exclusions or constraints;
- the intended next workflow stage.

The command arguments may contain a change identifier and a list of finding IDs or concise findings.

If no identifier is provided:

1. Run `openspec list`.
2. Continue only if exactly one active change can be identified unambiguously.
3. Otherwise report the available candidates and request an explicit identifier.

If the user provides finding IDs, locate the corresponding findings and verify that they refer to the selected change.

If an audit report is present in the conversation, use it only if it clearly matches the target change. Verify every actionable finding against the actual current artifacts.

If no applicable audit report exists, perform a read-only assessment using the `openspec-audit` skill before deciding what to repair.

Do not automatically repair every MINOR recommendation. Focus on confirmed defects, user-requested changes, and necessary corrections to make the change coherent.

## Step 2: Inspect the current state

Read:

- the relevant artifacts of the target change;
- the project's OpenSpec configuration and active schema;
- repository instructions;
- all artifacts implicated by the findings;
- authoritative repository sources needed to verify the findings.

Read complete affected artifacts when necessary to understand their context and avoid introducing contradictions.

Determine which files are actually artifacts of the target change.

Do not edit project-wide configuration or base specifications just because an audit mentions them. If a problem lies outside the change's permitted edit boundary, report it separately.

Check for existing user modifications and changes made since the audit.

## Step 3: Define a minimal repair plan

Before editing, summarize the intended changes:

- finding IDs to address;
- target artifacts;
- evidence confirming each finding;
- the proposed correction;
- any findings that will remain unresolved and why.

Do not replace entire artifacts when a focused correction is sufficient.

If fixing one artifact requires changes to others, update the related artifacts coherently. For example, a changed requirement may require corresponding updates to design decisions, tasks, and verification criteria.

Do not alter unrelated parts of the change.

## Step 4: Repair the artifacts

### Proposal or equivalent scope artifact

- Keep the objective, rationale, capabilities, boundaries, risks, and expected outcomes consistent.
- Preserve explicitly approved scope.
- Ensure the stated capabilities and affected areas correspond to the actual change specifications.
- Do not add functionality simply because it would be convenient.

### Specifications or requirements artifacts

- Follow the configured OpenSpec schema.
- Describe observable behavior, constraints, and expected outcomes.
- Add or correct scenarios only when supported by the change intent and authoritative evidence.
- Handle error cases, optional values, permissions, and edge conditions when relevant.
- Preserve requirement traceability and identifiers where appropriate.
- Follow the schema's rules for added, modified, removed, or renamed requirements.
- Do not invent API methods, fields, statuses, domain rules, or requirements to satisfy validation.

### Design or implementation approach

- Match actual repository architecture, dependencies, configuration, and constraints.
- Resolve contradictions with the approved requirements.
- Prefer existing capabilities over unnecessary dependencies or abstractions.
- Make trade-offs explicit when a definitive solution cannot be established from available evidence.
- Do not silently convert an unresolved decision into an assumed requirement.
- Keep implementation details in the design artifact when that is what the schema expects.

### Tasks or execution checklist

- Cover all applicable requirements.
- Preserve meaningful traceability between requirements and tasks.
- Correct dependency and execution ordering.
- Merge duplicate tasks when this improves clarity without losing verification.
- Combine empty skeleton tasks with the corresponding functional implementation.
- Retain necessary tests, setup, migration, rollout, documentation, and verification work.
- Remove only tasks that are demonstrably redundant or outside the approved scope.
- Do not optimize toward an arbitrary task count.
- Keep task completion criteria observable and verifiable.
- Ensure final verification occurs after the work it validates.

### Other artifacts

If the active schema defines different artifacts, repair them according to that schema and their actual purpose. Do not assume a standard artifact set.

## Step 5: Protect repository and scope boundaries

Use repository-specific instructions and the approved change scope to determine what may be changed.

The default boundary for this skill is limited to files inside the selected change directory that belong to its OpenSpec workflow.

Reference source files may be read to verify correctness but must not be modified.

Do not modify:

- base specifications;
- global OpenSpec configuration or schemas;
- application code;
- tests or generated artifacts;
- API contracts;
- build or dependency manifests;
- infrastructure or deployment configuration;
- unrelated changes.

These boundaries can be expanded only by explicit user authorization for the affected area.

If an audit finding requires an out-of-scope change, document the problem and the precise decision or authorization needed. Do not make the change implicitly.

## Step 6: Validate the repair

After editing, execute checks supported by the installed CLI and repository.

At minimum, where available:

`openspec validate <change-id> --strict`

`openspec list`

`git status --short`

`git diff --check`

Inspect the diff for all tracked modifications.

For untracked artifacts, inspect their actual contents separately because ordinary `git diff` does not show them.

Where appropriate, compare the task count with OpenSpec's reported count using the actual task syntax and installed CLI conventions. Explain discrepancies rather than forcing counts to agree through meaningless changes.

Check that validation passes because the artifacts are correct, not because constraints or requirements were weakened.

Do not run the apply workflow, implement the application, archive the change, or commit/stage anything.

If validation fails, fix issues that are clearly within the repair scope. If the failure indicates a schema, configuration, or product decision outside that scope, stop and report it.

## Step 7: Report the result

Write the report in Russian unless instructed otherwise.

Include:

1. **Verified findings:** which original findings were confirmed or rejected based on the current files.
2. **Repairs:** finding IDs, files changed, and the reason for each modification.
3. **Diff summary:** concise explanation of what changed and confirmation that unrelated modifications were preserved.
4. **Validation:** exact commands executed and actual results.
5. **Unresolved issues:** remaining risks, out-of-scope issues, or decisions requiring user input.

Do not claim that an issue was fixed if it was merely reworded or moved elsewhere.

Do not claim that the change is approved; a separate read-only audit should verify the repair.

End with exactly one status:

- `REPAIRED — READY FOR RE-AUDIT`
- `PARTIALLY REPAIRED — REVIEW REQUIRED`
- `BLOCKED — USER DECISION REQUIRED`