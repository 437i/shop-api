---
description: Audit any OpenSpec change without modifying files
agent: plan
---

Use the `openspec-audit` skill and follow its workflow completely.

Target: $ARGUMENTS

## Target selection

If the arguments identify a change, audit that exact change.

If no change identifier was provided:
1. Run `openspec list`.
2. If exactly one intended active change can be identified, use it.
3. If multiple changes are available, report their identifiers and ask the user to specify one.
4. Do not guess based on modification time or a previous task.

If the target cannot be located, report the problem. Do not silently audit a different change.

## Execution

- Load and follow the `openspec-audit` skill using OpenCode's skill mechanism. If the skill cannot be loaded, read its SKILL.md directly.
- Inspect actual repository instructions, OpenSpec configuration, schema, target artifacts, and relevant source files.
- Validate the change with the installed OpenSpec CLI where supported.
- Run the applicable read-only checks.
- Do not rely exclusively on summaries or previously generated audit reports.

## Hard restrictions

Do not modify, create, delete, format, stage, or repair files.

Do not implement application code or invoke the apply workflow.

Do not install dependencies, regenerate artifacts, or run mutating commands.

## Output

Respond in Russian unless the user requests another language.

Provide:
- BLOCKER, MAJOR, and MINOR findings;
- unique finding IDs;
- exact file paths and requirement/task headings;
- evidence, impact, and specific recommendations;
- requirement-to-task coverage when applicable;
- actual validation and read-only check results;
- unresolved uncertainties or unavailable evidence.

Finish with exactly one verdict:

- APPROVE
- NEEDS REVISION
- INCOMPLETE

APPROVE requires no unresolved BLOCKER or MAJOR findings and sufficient evidence for the intended next stage.

A passing CLI validation alone is not sufficient for approval.