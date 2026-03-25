---
description: Initial setup of docs/ folder — deep codebase analysis, user interview, and template filling
disable-model-invocation: true
template: docs
---

# Setup Docs Workflow

Populate the project's `docs/` stub files with accurate, project-specific information.

> **Source rule:** Every sentence written into a doc must trace back to a codebase file, a URL referenced in the project, or an explicit user statement. Never invent, assume, or hallucinate content.

## Phase 1: Analyze Existing Documentation and Codebase

### 1.1 Classify docs/ files

Read each file in `docs/`:

- **Stub** — every section contains only an HTML comment (`<!-- … -->`) and no prose. These are candidates to fill.
- **Filled** — sections contain actual prose. Preserve existing content; only add to sections that are still stubs. For others, only do suggestions or extensions.

### 1.2 Extract information from the codebase

Read project files as the primary source of truth — do not ask the user for information already present here:

- `README.md` — project name, description, installation, usage
- `package.json` / `composer.json` — dependencies, scripts, package manager, project metadata
- `.eslintrc.*`, `.prettierrc.*`, `phpcs.xml` — code style configuration
- `vitest.config.*`, `jest.config.*`, `phpunit.xml`, `playwright.config.*` — testing frameworks and commands
- `.gitlab-ci.yml`, `.github/workflows/*` — CI/CD pipelines and environments
- Any URLs already linked in existing project files (README, AGENTS.md, docs/)
- `git config --get init.defaultBranch` — main branch name

### 1.3 Present gap analysis

Show the user a summary:

- ✅ **Already documented** — section has prose, will not be overwritten
- 📝 **Auto-extracted** — information found in codebase files, will be used directly
- ❌ **Missing** — not in any project file, user input required

## Phase 2: Select Documents to Populate

> **Interviewing:** Use the `AskUserQuestion` tool (multiSelect) to let the user choose which docs to fill. See `interviewing.md` rule for details.

List the stub docs found and let the user choose which to fill now:

> "The following docs still need content. Which would you like to document now?"
>
> - [ ] `docs/PRODUCT.md`
> - [ ] `docs/ARCHITECTURE.md`
> - [ ] `docs/STANDARDS.md`
>
> You can select all or skip any for later.

Only proceed with the selected files.

## Phase 3: Interview — Fill Gaps Only

> **Interviewing:** Use the `AskUserQuestion` tool for all gap questions. Batch related questions per document (max 4 per call). See `interviewing.md` rule for details.

For each selected document, ask only about information that is **missing** from the codebase (identified in Phase 1.3). Skip questions where the answer is already available.

Batch related questions. Be conversational. Provide sensible defaults where possible.

Allow the user to skip any question — if they did not provide information for some sections, do not invent or assume. Leave those sections as stubs or use codebase-extracted data if relevant.

**Per-document question guide:**

### docs/PRODUCT.md

- Vision: What is the long-term goal of this product?
- Problem: What problem does it solve, and for whom?
- Target users: Who uses it? What are their needs?
- Key features: What are the main capabilities?
- User journeys: What are the primary flows a user goes through?
- Roadmap: What is planned? (check issue tracker or board if accessible)
- Risks: What could go wrong or slow adoption?

### docs/ARCHITECTURE.md

- Overview: How does the system work at a high level?
- Components: What are the main modules and their responsibilities?
- Interfaces: How do components communicate?
- Design decisions: Why were key technology or architecture choices made?

### docs/STANDARDS.md

- Development process: Branching strategy, code review requirements, release flow
- Git workflow: Main branch name, commit message format
- Naming conventions: Any project-specific conventions beyond linter rules?

## Phase 4: Write Documentation

Fill the selected stub files following the `documentation` skill rules, using exclusively:

1. **Codebase data** — information extracted in Phase 1.2
2. **User answers** — statements made in Phase 3

## Phase 5: Update AGENTS.md

After filling docs, update `AGENTS.md` so agents know where to find the documentation.

For each doc that was filled, append a reference line to the corresponding section in `AGENTS.md`:

- `docs/PRODUCT.md` → `## Product Overview` — `Check [Product](docs/PRODUCT.md) docs to understand the product vision.`
- `docs/ARCHITECTURE.md` → `## Project Structure` — `Check [Architecture](docs/ARCHITECTURE.md) docs to understand the system design.`
- `docs/STANDARDS.md` → `## Additional Context` — `Check [Standards](docs/STANDARDS.md) docs for company technical standards.`

Rules:

- If the target section does not exist in `AGENTS.md`, create it before the line `## Feature planning`.
- Skip if the reference already exists in the section (idempotent).
- Never overwrite or remove existing content in `AGENTS.md`.

## Phase 6: Further Documentation Suggestions

After filling the selected docs, suggest additional documentation that could be useful based on the project files. For example:

- [README.md](README.md) — if there are outdated instructions or missing sections (e.g., usage, installation, testing, contributing, monitoring)
- Other `.md` files in the codebase that are folder-specific and could be extended, improved, or moved to `docs/`
- Any additional opportunities

## Phase 7: Review and Commit

Show a `git diff` of all modified files and ask:

> "Do these docs look accurate? Add any missing context directly, then commit when ready."

Suggest a commit message following the project's commit conventions (check `.git/hooks/commit-msg` and recent commits for format).
