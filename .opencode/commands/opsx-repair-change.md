---
description: Repair confirmed issues in an OpenSpec change without implementing the application
agent: build
---

Use the `openspec-repair` skill. Load it with the skill tool before starting.

The arguments are expected to contain the target OpenSpec change identifier and, optionally, the findings to address:

$ARGUMENTS

If no target change identifier was provided:
1. Run `openspec list`.
2. Proceed only if exactly one active change can be identified unambiguously.
3. Otherwise request an explicit change identifier.

If specific audit findings are provided, verify them against the current files before editing.

If only a change identifier is provided, inspect the latest audit results in the current conversation. If no actionable findings are available, run a read-only audit using the `openspec-audit` skill before modifying files.

Follow the repair workflow in `openspec-repair`.

Before editing, summarize the intended minimal changes. Then repair only the relevant OpenSpec artifacts for the target change.

Do not modify application source code, tests, Swagger, database schemas, migrations, Docker Compose, Nginx, or unrelated OpenSpec changes.

Do not run `/opsx-apply`, implement the feature, archive the change, or commit changes.

After the repair:
- Run `openspec validate <change-id> --strict`.
- Run `openspec list`.
- Run `git diff --check`.
- Review the diff and task counts.
- Report which findings were fixed and which remain unresolved.

Respond in Russian and end with one status:
- REPAIRED — READY FOR RE-AUDIT
- PARTIALLY REPAIRED — REVIEW REQUIRED
- BLOCKED — USER DECISION REQUIRED