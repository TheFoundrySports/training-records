---
description: Git commit message format — include ticket number, consistent style, branch check.
alwaysApply: true
---

# Commit Rules

## Always

- Always follow the `.git/hooks/commit-msg` hook for commit messages if it does exists
  - If a commit-msg hook is configured, ensure the commit message passes validation before committing
  - If a commit is rejected by the hook, fix the message and retry — never bypass or skip the hook
- Always include the ticket number in the commit message even if not specified in the commit-msg hook, `#<number>: <message>`.
- Always use context from the current branch, MR, or issue when crafting commit messages
- Always check previous commits to ensure consistency in style and format before writing a new commit message
- Always run `git branch --show-current` to verify the active branch matches the intended feature branch before committing
