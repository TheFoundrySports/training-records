---
description: Interactive setup wizard to configure agent context and copy templates to user environment
disable-model-invocation: true
---

# Setup Workflow

Configure the agent environment for AI-assisted development on this project.

## Phase 1: Pre-flight Checks

### 1.1 Git Status

Run `git status`. If there are uncommitted changes unrelated to a previous `/setup` run, stop and inform the user:

> "⚠️ Setup paused. Please commit or stash unrelated changes first:
>
> ```bash
> git add . && git commit -m 'WIP' # or: git stash
> ```
>
> This ensures you can see what setup changes. Run `/setup` again when clean."

**Note:** If changes are only in `docs/` or `AGENTS.md` from a previous setup, you may continue.

### 1.2 Resolve Git Platform

<!-- Read `.agent/.1xai-manifest.json` and check for a `platform:*` entry in the `templates` array. -->

- **`platform:glab`** → GitLab (CLI: `glab`)
- **`platform:gh`** → GitHub (CLI: `gh`)
- **`platform:az`** → Azure DevOps (CLI: `az`)
- **No platform entry** → Use the `AskUserQuestion` tool to ask: *"Which Git platform does this project use?"* with options: GitLab, GitHub, Azure DevOps, Other. Then proceed accordingly. 

**CLI setup per platform:**

**GitLab (`glab`):**

- Check `glab --version`. If not installed: `brew install glab` (or see <https://gitlab.com/gitlab-org/cli>)
- Check `glab auth status`. If not authenticated: `glab auth login --hostname HOSTNAME`

**Azure DevOps (`az`):**

- Check `az --version`. If not installed: `brew install azure-cli` (or see <https://aka.ms/installazurecli>)
- Install extension: `az extension add --name azure-devops`
- Authenticate: `az login` then `az devops login` (requires PAT from dev.azure.com)
- Configure: `az devops configure --defaults organization=URL project=NAME`

**GitHub (`gh`):**

- Check `gh --version`. If not installed: `brew install gh` (or see <https://cli.github.com>)
- Check `gh auth status`. If not authenticated: `gh auth login`

**Other:** Note the choice, continue without CLI setup.

## Phase 2: Review Installed Templates

### 2.1 Check Installed Templates from Manifest

<!-- Read `.agent/.1xai-manifest.json` → `templates` array. Templates are entries without a `:` separator (e.g. `docs`, `drupal`, `playwright-ddev`). Platform and à-la-carte entries (`platform:*`, `skill:*`, `rule:*`, `workflow:*`) are not templates. -->

Use this list as the source of truth — no need to detect templates from directory structure.

### 2.2 Check for Relevant not installed Templates

If templates that look relevant to the project are not in the manifest (e.g., a Drupal project without `playwright-ddev`), mention them:

> "This looks like a Drupal/DDEV project. You could add E2E testing support by running:
<!-- > `npx @1xINTERNET/1x-ai . --add playwright-ddev`" -->

## Phase 3: Additional Setups

Scan `.agent/workflows/` for any files matching `setup-*.md`. For each, read its frontmatter `template` field and check whether that template is present in the manifest. Only include workflows whose template is installed. If none qualify, skip this phase silently.

If any qualify, present them all at once and ask which to run:

> "I found additional setup workflows. Which would you like to run?
>
> - [ ] `/setup-<name>` — [description from frontmatter]
> - [ ] ...
>
> Reply with a number, a comma-separated list, `all`, or `none`."

Run the selected workflows sequentially, then continue.

## Phase 4: Summary and Next Steps

Show a concise summary and propose relevant next commands:

> **Setup complete.** Git platform: [read from manifest] | CLI: [glab/az/gh/none]
>
> **Suggested next steps:**
>
> - `/setup-docs` — fill `docs/` stubs with project-specific information *(only suggest if `docs` is in the manifest and stubs exist)*
> - `/plan` — start planning a feature or task
> - `/review` — review current changes before creating a merge request
> - `/create-mr` — create a merge request for the current branch

Only suggest commands that are relevant given the current project state (e.g., skip `/setup-docs` if all docs are already filled or `docs` is not in the manifest).

## Notes

- Be conversational and friendly.
- Use the `AskUserQuestion` tool for any choices presented to the user. See `interviewing.md` rule for details.
- If errors: explain clearly, suggest fix, offer retry.
- Do not fill `docs/` files directly — that is handled by `/setup-docs`.
