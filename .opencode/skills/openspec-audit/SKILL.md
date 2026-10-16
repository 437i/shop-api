---
name: openspec-audit
description: Perform a thorough read-only audit of any OpenSpec change for structural validity, requirement correctness, design consistency, implementation readiness, and verification coverage.
---

# OpenSpec Audit

## Purpose

Perform a rigorous, read-only audit of an OpenSpec change before implementation or another explicitly requested review milestone.

Determine whether the change is valid under the project's configured OpenSpec schema, consistent with the actual repository, adequately specified, and ready for its intended next stage.

This skill is repository-agnostic. Do not assume a particular programming language, framework, application architecture, API format, deployment platform, or project structure.

A successful OpenSpec validation is necessary when applicable, but it does not prove that the change is semantically correct or ready for implementation.

## Mandatory rules

1. Read the actual files and inspect the actual repository state. Do not rely exclusively on summaries, previous agent reports, or claimed results.
2. Never create, modify, delete, reformat, or stage files.
3. Never implement code or automatically repair findings.
4. Do not invent requirements, behavior, APIs, dependencies, architecture, or repository structure.
5. Distinguish confirmed defects from risks, assumptions, and optional recommendations.
6. Report a command as successful only if it was actually executed and its result observed.
7. Inspect the current Git working tree and preserve unrelated user changes.
8. Keep the audit scoped to the selected change and the repository context necessary to assess it.
9. Do not browse external sources when the repository already contains sufficient authoritative evidence. Use external sources only when the task requires external verification or the relevant contract cannot be established locally.
10. Do not expand the change's scope or impose personal architectural preferences as requirements.
11. Follow applicable repository instructions, including AGENTS.md and other project-specific guidance.
12. If required evidence is unavailable, explicitly state the limitation instead of guessing.

## Step 1: Identify the target change

Determine the change identifier from the user's request or invoking command.

If no identifier is provided:

1. Run `openspec list`.
2. Identify the active changes reported by the installed CLI.
3. Continue only if exactly one intended change can be identified unambiguously.
4. If several changes are possible, report their identifiers and ask the user to select one.

Do not assume that the most recently modified change is the intended target.

Verify that the selected change actually exists in the correct OpenSpec store or workspace, if the project uses more than one.

Do not silently switch to another change when the requested one cannot be found.

## Step 2: Discover the project's OpenSpec workflow

Inspect the configuration and documentation that determine how OpenSpec is used in this repository.

Where applicable, read:

- `openspec/config.yaml`;
- the target change's metadata file, such as `.openspec.yaml`;
- the project's schema definition, if it uses a custom schema;
- workflow instructions and repository-specific rules;
- the artifact definitions, dependencies, and templates required by the active schema.

Use the installed CLI and the actual configured schema as the source of structural expectations.

Do not assume every change must contain `proposal.md`, `design.md`, `tasks.md`, or delta specifications. Determine which artifacts are required, optional, or explicitly skipped by the active workflow.

For example, a tooling-only or refactoring change may legitimately have no behavior-level specification when the configured workflow explicitly allows it.

Conversely, do not accept missing specifications when the change introduces or modifies behavior and the active schema requires them.

Do not force a custom-schema project into the default `spec-driven` workflow.

## Step 3: Inspect the change and relevant repository context

Read the complete contents of all artifacts that exist and are relevant to the selected change.

Include, as applicable:

- proposal or equivalent motivation and scope artifact;
- behavior specifications or equivalent requirements artifacts;
- design or implementation approach;
- task checklist or execution plan;
- change metadata;
- relevant existing specifications;
- relevant repository instructions;
- source code and tests implementing related existing behavior;
- dependency manifests and lockfiles;
- configuration, schema, contract, or code-generation sources;
- documentation describing expected behavior and verification.

Do not limit the review to file names, headings, short excerpts, or a previous agent's summary.

For each source, establish its role:

- authoritative source of requirements;
- authoritative source of existing behavior;
- derived or generated artifact;
- explanatory documentation;
- implementation evidence.

When sources disagree, report the contradiction and explain which source appears authoritative and why. Do not silently choose whichever version is most convenient.

## Step 4: Validate OpenSpec structure and semantics

Run the applicable structural validation command supported by the installed CLI.

For a standard CLI that supports it, run:

`openspec validate <change-id> --strict`

Also run:

`openspec list`

Inspect command output and exit status.

Check all applicable items:

### Workflow and artifacts

- The change follows its configured schema and workflow.
- Required artifacts exist.
- Optional or intentionally skipped artifacts are handled correctly.
- Artifact dependencies and completion order are valid.
- Metadata uses recognized fields and values.
- Declared capabilities, feature areas, or equivalent change identifiers correspond to the actual specifications.
- Paths follow the configured schema rather than assumptions from another project.

### Requirements and specifications

- Requirements describe observable outcomes or explicitly defined constraints.
- Normative statements are clear and testable.
- Scenarios follow the required syntax and contain meaningful conditions, actions, and outcomes.
- Each requirement has sufficient coverage.
- Modified requirements contain the complete updated requirement when required by the schema.
- Removed or renamed requirements follow the schema's migration and naming rules.
- No requirements have been invented merely to satisfy validation.
- No relevant existing requirements or behavior have been overlooked.
- Specifications accurately describe the intended change without drifting into unrelated features.

### Cross-artifact consistency

- Motivation, scope, requirements, design, tasks, and verification agree with one another.
- Non-goals remain excluded throughout the plan.
- Risks and constraints have corresponding mitigations or explicit acceptance decisions where necessary.
- Dependencies and assumptions are stated consistently.
- No artifact contradicts another or silently changes an earlier decision.

A passing validator result does not override semantic problems discovered during review.

## Step 5: Verify domain-specific claims conditionally

Apply the following checks only when relevant to the change.

Do not force irrelevant sections into the audit.

### API, protocols, and integrations

When a change interacts with an API or external system:

- identify the authoritative contract;
- verify operations, paths, methods, payloads, field names, required and optional fields, response structures, status codes, and error semantics;
- inspect authentication, authorization, pagination, filtering, binary transfers, and empty responses when applicable;
- compare generated types or clients with their actual source contract;
- verify how dependencies are configured and whether required services exist;
- identify assumptions that cannot yet be tested.

Do not infer API behavior from endpoint names, examples, or memory alone.

### Application behavior and user interfaces

When relevant, verify:

- primary and alternate user flows;
- loading, success, empty, error, and recovery states;
- invalid input handling;
- navigation, permissions, state transitions, and session behavior;
- accessibility and keyboard behavior when required;
- consistency between requirements and the planned tests.

Only apply states and behavior appropriate to the feature.

### Architecture and implementation design

When relevant, verify:

- compatibility with the current architecture;
- appropriate separation of responsibilities;
- reuse of existing abstractions and components;
- absence of unnecessary frameworks, dependencies, or layers;
- clear ownership of state, validation, business logic, and side effects;
- dependency versions and capabilities against actual manifests;
- a feasible migration or rollout approach when required.

Do not enforce a particular architecture merely because it is familiar.

### Security, privacy, and data

When relevant, verify:

- authentication and authorization boundaries;
- handling and storage of credentials, secrets, and sensitive data;
- trust boundaries and validation;
- failure behavior and access control;
- data exposure, logging, retention, and deletion;
- migrations, backwards compatibility, and rollback where applicable;
- differences between development, testing, staging, and production.

Distinguish confirmed vulnerabilities from potential risks and unresolved design choices.

### Testing and operations

When relevant, check:

- unit, integration, contract, end-to-end, or manual testing requirements;
- appropriate isolation and test data;
- external services or infrastructure required by tests;
- deterministic execution and reproducibility;
- observability, diagnostics, health checks, and deployment requirements;
- rollback or recovery procedures where relevant.

Do not require a test category or operational mechanism that is unnecessary for the change.

## Step 6: Audit task completeness and execution order

Read the entire task checklist or equivalent implementation plan.

Verify:

- every applicable requirement maps to one or more tasks;
- each task has a clear, verifiable outcome;
- dependencies and ordering are sensible;
- prerequisite configuration or tooling is included;
- implementation and tests are scheduled appropriately;
- final verification occurs after the work it verifies;
- acceptance criteria cover important edge cases;
- no tasks are duplicated;
- no placeholder or skeleton tasks create work without a meaningful deliverable;
- documentation tasks have a concrete purpose;
- non-goals have not silently entered the plan;
- the effort is proportionate to the change.

Do not target an arbitrary number of tasks or impose a preferred granularity without justification.

When task counts disagree with CLI output, inspect the actual checklist syntax and CLI counting convention. Reconcile the discrepancy instead of blindly counting every checkbox, nested list item, or example as an OpenSpec task.

For large changes, provide a concise requirement-to-task coverage map. Highlight requirements without tasks and tasks that do not trace to an approved requirement, necessary enabling work, or explicit verification need.

## Step 7: Run read-only checks

Run applicable checks available in the repository.

At minimum, where supported:

- OpenSpec validation for the target change;
- `openspec list`;
- `git status --short`;
- `git diff --check`.

Additional checks may include schema validation, contract consistency checks, dependency inspection, or other commands that are genuinely read-only and do not regenerate artifacts or change the environment.

Do not install dependencies, regenerate files, rewrite snapshots, run automatic formatters, or start implementation.

Do not assume `git diff --check` covers untracked files. Inspect untracked artifacts directly when relevant.

If a command is unavailable, fails to execute, or produces an ambiguous result, report that explicitly.

## Step 8: Report findings

Write the report in Russian unless the user or repository instructions require another language.

Use the following sections:

### BLOCKER

Issues that prevent safe or coherent implementation, violate a hard constraint, rely on a false contract, or make essential behavior impossible to verify.

### MAJOR

Important correctness, scope, architecture, compatibility, security, or verification problems that should be resolved before implementation.

### MINOR

Optional improvements or low-risk issues that do not prevent implementation.

### Findings format

For every finding, include:

- a unique identifier, such as `OS-001`;
- severity;
- exact file path and requirement/task heading;
- concise evidence from the actual artifact, code, configuration, or command output;
- impact;
- a specific recommended correction.

Do not invent line numbers or claim that a file contains something you have not inspected.

Clearly distinguish confirmed defects from inferred risks and recommendations.

### Coverage and execution plan

Summarize:

- whether requirements are covered by tasks;
- missing coverage and unnecessary tasks;
- dependency or ordering problems;
- test and operational gaps that matter to the change.

### Validation results

List each command that was actually run and its actual result. Separate CLI validation, content review, and checks that could not be performed.

### Verdict

Choose one:

- `APPROVE` — no unresolved BLOCKER or MAJOR findings; evidence is sufficient for the intended next stage.
- `NEEDS REVISION` — at least one BLOCKER or MAJOR finding remains.
- `INCOMPLETE` — the audit cannot reach a reliable verdict because essential files, context, or validation evidence are unavailable.

MINOR findings may remain under APPROVE, but must be listed.

End with concrete next actions.

Do not modify files or begin repair under any circumstances.