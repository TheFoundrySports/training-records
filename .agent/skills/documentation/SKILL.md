---
description: Expert knowledge for writing, reviewing, and maintaining project documentation in docs/
---

# Documentation Skill

Use this skill when filling, reviewing, or updating `docs/*.md` files in any project.

## Core Rule: No Invented Content

Every sentence written into a doc file must trace back to one of these sources:

1. A file in the project codebase (README, package.json, config files, source code)
2. A URL already referenced in the project (README, AGENTS.md, existing docs)
3. An explicit statement made by the user in the current session

Never invent, assume, or infer content that is not present in the above sources.

## Single Source of Truth Map

Each piece of information belongs in exactly one file. Cross-reference with markdown links; never duplicate prose.

| Information type | Owner file |
|---|---|
| Installation, quick start, prerequisites | `README.md` |
| Agent-specific behavior, doc links | `AGENTS.md` |
| Functional documentation, vision, key features (short descriptions), user journeys, glossary, roadmap | `docs/PRODUCT.md` |
| Tech stack, components, architecture, design decisions | `docs/ARCHITECTURE.md` |
| Development process, code style, branching, linters | `docs/STANDARDS.md` |
| Per-feature detail: scope, criteria, config, decisions | `docs/features/<name>.md` |

## Feature Specs (`docs/features/`)

Feature specs are standalone documents for individual features. They are the authoritative source for feature-level detail.

- Use `/document-feature` to create or update a spec.
- `docs/PRODUCT.md` links to specs — it does not duplicate their content.
- Specs never reference skills.

### Linking specs from skills

When a skill's behaviour is tied to a specific feature, reference the relevant spec directly in the skill's markdown body — e.g. a link or a `> See [docs/features/feature-name.md](...)` note. This keeps the relationship visible without requiring special frontmatter.

## Stub Detection

A file (or section) is a stub when it contains only an HTML comment and no prose beneath it:

```markdown
## Section Title

<!-- What goes here? -->
```

A section is filled when it has prose below the heading (even if a comment is also present).

## Preserving Comment Prompts

Always keep `<!-- … -->` HTML comments in docs even after filling the section. They guide future human and agent editors on what belongs there.

## Anti-Duplication Rules

- If the tech stack is already detailed in `README.md`, write in `ARCHITECTURE.md`: `See README.md for the full dependency list.` and focus on architecture patterns instead.
- If install steps exist in `README.md`, do not repeat them in any `docs/` file — link to `README.md`.
- If a testing command is in `package.json` scripts, reference it by script name rather than copying the raw command.

## Cross-Reference Pattern

```markdown
## Technology Stack

See [README.md](../../../README.md) for dependencies and installation.

This project uses:

- **Architecture pattern**: [describe pattern, e.g., MVC with service layer]
- **Key design decisions**: [explain WHY choices were made, not just what they are]
```

## Filling Sections from Codebase Data

Preferred extraction sources (read these before asking the user):

- `package.json` / `composer.json` — name, description, dependencies, scripts
- `.eslintrc.*`, `.prettierrc.*`, `phpcs.xml` — linter and formatter configuration
- `vitest.config.*`, `jest.config.*`, `phpunit.xml`, `playwright.config.*` — test frameworks and locations
- `.gitlab-ci.yml`, `.github/workflows/*` — CI/CD pipeline structure
- `git log --oneline -10` — commit message style and conventions
- `git config --get init.defaultBranch` — main branch name
- URLs in `README.md`, `AGENTS.md`, existing docs — for reference and linking
