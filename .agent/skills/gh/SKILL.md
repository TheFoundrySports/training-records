---
description: Use GitHub CLI (gh) to manage pull requests, issues, and Actions
---

# GitHub CLI (gh)

Infer `owner/repo` from `git remote -v` when possible, or ask the user. For **GitHub Enterprise Server**, set `GH_HOST` (or use `gh auth login --hostname`) so commands target the right host.

Before other commands, verify authentication:

```bash
gh auth status
gh auth login
```

## Pull requests

```bash
gh pr list
gh pr view <number>
gh pr create --fill
gh pr create --title "Title" --body "Description"
gh pr checkout <number>
gh pr merge <number> --squash
```

## Issues

```bash
gh issue list
gh issue view <number>
gh issue create --title "Title" --body "Body"
gh issue comment <number> --body "Message"
```

## Actions (CI)

```bash
gh run list
gh run view <run-id>
gh workflow run <workflow>
```

## Repo and API

```bash
gh repo view
gh api repos/OWNER/REPO/...
```

## Tips

- Add `--web` to open in the browser
- Add `--json` with field selectors for scripting (`gh pr list --json number,title`)
- Use `gh --help` and `gh <command> --help` for flags

## Gotchas

- **`gh pr create`** needs a **pushed** branch; push before creating if needed.
- Prefer **`--body-file path`** (or stdin) for long PR/issue bodies instead of huge shell-quoted strings.
- **`gh issue comment`** uses **`--body`** (unlike some other CLIs that use `-m` only).
- Respect project rules: do not open a PR unless the user explicitly asked for it in the prompt.
