---
name: document-feature
description: >
  Create or update a feature spec in docs/features/.
  Trigger: When user wants to document a specific feature.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

# Document Feature Workflow

Create or update a feature spec file in `docs/features/` for a given feature.

> **Source rule:** Every sentence written must trace back to a codebase file, a URL referenced in the project, or an explicit user statement. Never invent, assume, or hallucinate content. See the `documentation` skill for writing rules.

## Phase 1: Identify the Feature

Determine the feature to document from context:

1. **From arguments** — use the feature name or path provided directly.
2. **From current changes** — run `git diff` / `git status` to infer the feature from changed files.
3. **From user** — if not clear, ask: _"Which feature should I document?"_

Derive a `kebab-case` filename from the feature name (e.g., `user-authentication.md`).

## Phase 2: Check for Existing Spec

- If `docs/features/<name>.md` exists — read it and proceed to update mode.
- If it does not exist — create `docs/features/` if needed, copy from `templates/docs/features/FEATURE.md`, and proceed to fill mode.

## Phase 3: Gather Context

Read codebase sources relevant to the feature before writing:

- Source files, components, or modules identified in Phase 1.
- `docs/PRODUCT.md` and `docs/ARCHITECTURE.md` for broader product and architectural context.
- Any related skills with a `context:` field pointing to this feature.

Only ask the user about gaps that cannot be resolved from the codebase alone. Batch into a single `AskUserQuestion` call if needed.

## Phase 4: Write or Update the Spec

Fill or update the spec following the template sections:

- **Overview** — what the feature does and why it exists.
- **Acceptance Criteria** — what "done" looks like.
- **Scope** — components, modules, or APIs touched.
- **Configuration** — env vars, flags, or options that affect this feature.
- **Design Decisions** — key decisions and reasoning.
- **Changelog** — summarise what changed if updating an existing spec.

Keep HTML comment prompts in place after filling. Follow all rules in the `documentation` skill.

## Phase 5: Update PRODUCT.md Entry

Check `docs/PRODUCT.md`:

- If a `## Key Features` entry for this feature already exists — update it to match the spec overview.
- If no entry exists — add a one-line entry with a link:

```markdown
- **Feature Name** — One-sentence description. See [docs/features/feature-name.md](features/feature-name.md).
```

## Phase 6: Review

Show the written or updated spec to the user and ask:

> "Does this look accurate? Add any missing context directly, then commit when ready."
