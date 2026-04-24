---
name: document-project
description: >
  Re-document the project based on recent changes - updates stale docs.
  Trigger: When user wants to update project documentation.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

# Document Project Workflow

Update `docs/` files to reflect what has changed in the project since they were last written.

> **Source rule:** Every sentence written into a doc must trace back to a codebase file, a URL referenced in the project, or an explicit user statement. Never invent, assume, or hallucinate content. See the `documentation` skill and rule for writing rules.
>
> **Scope:** This workflow targets existing, previously-filled docs. If `docs/` has never been populated, run `/setup-docs` instead.

## Phase 1: Identify What Changed

Determine the relevant scope of changes using the following priority order:

1. **Uncommitted changes** — run `git status`. If modified files exist, run `git diff` (staged + unstaged). These are the most immediate signal.
2. **Feature branch** — run `git branch --show-current`. If not on the main branch, run `git diff $(git merge-base HEAD <main-branch>)...HEAD` to see all branch changes vs main.
3. **Main branch, no uncommitted changes** — find the last commit that touched `docs/` with `git log --format="%H" -- docs/ | head -1`, then run `git log --oneline <that-commit>..HEAD` to see what changed since.

Use the output to build a list of changed files and areas.

## Phase 2: Map Changes to Doc Sections

Cross-reference changed files against the documentation ownership map:

| Changed area | Likely doc section |
| --- | --- |
| `package.json`, `composer.json`, dependencies | `docs/ARCHITECTURE.md` — Tech stack |
| New modules, services, components | `docs/ARCHITECTURE.md` — Components |
| Config files (linters, formatters) | `docs/STANDARDS.md` — Code style |
| CI/CD pipeline files | `docs/STANDARDS.md` — Development process |
| `README.md` | `docs/PRODUCT.md` or `docs/ARCHITECTURE.md` |
| New features, user-facing changes | `docs/PRODUCT.md` — Key Features (one-line entry) + `docs/features/<name>.md` |

List the affected doc sections. Skip docs with no relevant changes.

> **Feature specs:** If changed files map to a new or updated feature and `docs/features/` exists, do not write feature-level detail into `PRODUCT.md`. Instead, either:
> - Run `/document-feature` inline if the feature is clearly identified, or
> - Note the gap and prompt: _"Run `/document-feature <name>` to document this change."_

## Phase 3: Review Affected Sections

Read each affected doc section and evaluate:

- **Still accurate** — no update needed; note it.
- **Outdated** — content contradicts or omits the changes; mark for update.
- **Missing** — section is a stub that the changes now provide data for; mark to fill.

Only ask the user about gaps that cannot be resolved from the codebase alone. Keep questions minimal — batch into a single `AskUserQuestion` call if needed.

## Phase 4: Update Documentation

Apply updates to the affected sections following the `documentation` skill.

## Phase 5: Review and Commit

Show the main changes of all modified files and ask:

> "Do these updates look accurate? Add any missing context directly, then commit when ready."
