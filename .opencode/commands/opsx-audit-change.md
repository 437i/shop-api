---
description: Audit an OpenSpec change without modifying files
agent: plan
---

Use the `openspec-audit` skill. Load it with the skill tool before starting.

Audit the OpenSpec change identified by `$ARGUMENTS`.

If `$ARGUMENTS` is empty:
1. Run `openspec list`.
2. If exactly one active change exists, audit it.
3. If multiple changes exist, list their identifiers and ask the user to specify one.
4. Do not guess based on modification time.

Follow the entire audit workflow in the skill.

Inspect actual artifacts and source files. Run the applicable read-only validation commands, including `openspec validate <change-id> --strict`.

Do not modify files, repair issues, implement code, or launch `/opsx-apply`.

Report in Russian:
- BLOCKER, MAJOR, and MINOR findings.
- Exact artifact paths and requirement/task headings.
- Evidence and specific corrections.
- Requirement-to-task coverage.
- Actual validation results.
- Final verdict: APPROVE or NEEDS REVISION.

A successful OpenSpec validation is necessary but not sufficient for approval.