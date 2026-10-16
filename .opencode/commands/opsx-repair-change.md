---
description: Repair verified issues in any OpenSpec change without implementing application code
agent: build
---

Use the `openspec-repair` skill and follow its workflow completely.

Arguments: $ARGUMENTS

The first argument should identify the target OpenSpec change. Additional arguments may specify finding IDs or concise repair instructions.

## Target selection

If a target change identifier is supplied, use that exact change.

If no identifier is supplied:
1. Run `openspec list`.
2. Continue only if exactly one intended active change can be identified.
3. Otherwise report the available identifiers and ask the user to select one.

Do not infer the target from modification time or assume that the previously discussed change is still the intended target.

If the target cannot be located, report the problem instead of switching to another change.

## Find and verify issues

- Load the `openspec-repair` skill using OpenCode's skill mechanism. If the skill cannot be loaded, read its SKILL.md directly.
- Inspect the current repository state and actual artifacts before editing.
- If the user supplied finding IDs or specific corrections, verify them against the files.
- If an applicable audit report for this exact change exists in the conversation, use it as a starting point and recheck the relevant evidence.
- If no applicable audit exists, perform a read-only assessment using the `openspec-audit` skill before deciding what needs repair.
- Do not blindly apply stale findings.
- Do not make cosmetic changes merely to produce a diff.

## Repair execution

Before editing, summarize the verified findings, target files, and minimal repair plan.

Then make only the necessary changes to the artifacts belonging to the selected change.

Keep the approved scope and requirements intact unless the user explicitly authorizes a scope change.

Do not modify application source, tests, generated code, project-wide configuration, base specifications, infrastructure, or unrelated changes.

Do not invoke the apply workflow, implement the feature, archive the change, stage files, or create commits.

If a correction requires a decision or modification outside the authorized scope, stop and report the issue rather than guessing.

## Validation

After repairs, run the applicable checks supported by the installed CLI.

At minimum, where available:
- `openspec validate <change-id> --strict`
- `openspec list`
- `git status --short`
- `git diff --check`

Inspect the diffs for tracked modifications and inspect untracked artifacts separately.

Report actual command results. Do not claim success for checks that were not executed.

## Final report

Respond in Russian unless instructed otherwise.

Include:
- verified findings confirmed and rejected;
- changes made and the corresponding files;
- the validation results;
- unresolved issues and decisions requiring user input.

End with exactly one status:

- REPAIRED — READY FOR RE-AUDIT
- PARTIALLY REPAIRED — REVIEW REQUIRED
- BLOCKED — USER DECISION REQUIRED