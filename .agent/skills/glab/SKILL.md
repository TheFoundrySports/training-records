---
name: glab
description: >
  Use GitLab CLI (glab) to manage merge requests, issues, and CI/CD.
  Trigger: When user wants to manage GitLab MRs, issues, or pipelines.
---

# GitLab CLI (glab)

Check the git origin URL to get the organization and project names, or ask the user. A `git.hostname.tld` remote indicates a self-hosted GitLab instance.

Before running other commands, set the default host once and verify authentication:

```bash
glab config set -g host git.example.com   # set once — all subsequent commands work without a prefix
glab auth status                           # verify authentication
glab auth login                            # authenticate if needed
```


## Merge Requests

```bash
glab mr list                              # List MRs
glab mr view <id>                         # View MR details
glab mr create --fill                     # Create MR from commits (auto title/description)
glab mr create -t "Title" -d "Desc"       # Create MR with explicit title/description
glab mr checkout <id>                     # Checkout MR locally
glab mr merge <id> --squash               # Merge MR with squash
```

## Issues

```bash
glab issue list                           # List issues
glab issue view <id>                      # View issue
glab issue create --title "Title"         # Create issue
glab issue update <id> --title "Title"    # Update issue title
glab issue update <id> --description "…" # Update issue description (use $(cat file) for multiline)
glab issue comment <id> -m "Message"     # Add a comment to an issue
```

## CI/CD

```bash
glab ci status                            # Pipeline status
glab ci view                              # View current pipeline
glab ci run                               # Trigger pipeline
```

## Tips

- Add `--web` to open in browser
- Add `-O json` for JSON output (scripting)
- Add `--yes` to skip confirmation prompts
- Use `glab --help` for more commands and options

## Gotchas

- **Never use `--related-issue`** on `glab mr create` — it overrides the source branch with the issue's branch, ignoring your current branch. Instead, reference issues in the MR description (e.g. `Relates to #123`).
- Always pass `--source-branch` explicitly if you're not on the branch you want to merge.
- **`glab issue comment` does not support `--body`** — use `-m "Message"` instead.
- For multiline issue descriptions, write to a temp file and pass with `--description "$(cat /tmp/file.md)"` rather than inlining the string.
