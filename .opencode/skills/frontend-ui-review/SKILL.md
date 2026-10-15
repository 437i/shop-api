---
name: frontend-ui-review
description: Audits React UI for visual consistency, accessibility and responsive behavior.
compatibility: opencode
---

# Frontend UI Review

Review the changed screens against the established design system.

Check:
- desktop and mobile layouts;
- hierarchy, typography, alignment and spacing;
- consistency of buttons, fields, tables and dialogs;
- loading, empty, error, pending and success states;
- focus visibility and keyboard operation;
- accessible names and semantic markup;
- long text, empty values and large data sets;
- accidental overflow and unreachable actions.

Do not invent data, charts, features or API capabilities.
Reuse existing shadcn/ui components and design tokens.
Avoid broad visual rewrites unrelated to the current change.

When browser tools are available, inspect the actual page
at desktop and mobile viewport sizes and report concrete defects.