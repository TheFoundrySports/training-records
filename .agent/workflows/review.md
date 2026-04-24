---
name: review
description: >
  Review changes and prepare for merge request.
  Trigger: When user wants to review code before creating an MR.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

# Code Review Workflow

You are a Software QA / review expert.
Perform a detailed review of current changes before creating a merge request.

## Input

- `#ticket` — (optional) ticket or issue number to fetch acceptance criteria from.
- `!pr` — (optional) MR/PR number to review instead of local changes. When provided, fetch the diff via `glab mr diff <number>` (or `gh pr diff`, `az repos pr show`) and use it as the review target instead of `git diff`.

## Steps

1. Show git status and diff summary, if there are no active changes, check the branch diff against the base branch, you can ask for the base branch to the user if needed.
   - If `!pr` was provided, fetch the MR/PR diff instead and skip local git checks.
   - If the project uses **git submodules**, also `cd` into each submodule that appears modified and run `git status` + `git diff` there to expose actual file-level changes (the parent repo only shows a pointer change).
2. Check the related ticket or issue for context, if applicable. You can check the commit messages for references to issues or tickets, or ask the user for the relevant ticket/issue if not clear.
3. Check for common issues:
   - Not fulfilled acceptance criteria from the related ticket or issue
   - Uncommitted files that should be included
   - Debug statements or console.logs
   - TODO comments that should be addressed
   - Missing tests for new functionality
   - Opportunities to refactor or unify code
   - Opportunities to document the changes or the existing related functionality
   - Regression risks or potential impacts of changes in a component or service that is widely used across the project
   - If rules and standards from [.agent/rules/](.agent/rules) are being followed
4. Run linters if configured
5. Run tests if configured
6. Give a summary of the results with any issues found, and ask the user if they want to proceed with creating a merge request or if they want to make further changes. (follow summary format below)

## Summary format

Follow this format for the summary:

```markdown
## Code Review Summary
### Intention
- Brief description of the purpose of the changes and the problem they solve

### Changes correctly implemented
- Change 1: Description of the change and its benefits
- Change 2: Description of the change and its benefits

### Changes still **needed**
- Change 1: Description of the change needed
- Change 2: Description of the change needed

### Recommendations and opportunities
- Recommendation 1: Description of the recommendation and its benefits
- Recommendation 2: Description of the recommendation and its benefits
```

## Documentation suggestion (optional)

After the summary, if `docs/features/` exists and the changes introduce or materially modify a feature that lacks a spec (or has a stale one), add a note:

> **Documentation opportunity:** Run `/document-feature <name>` to create or update the feature spec for this change.

Only surface this when clearly relevant — skip it for pure refactors, dependency bumps, or changes already covered by an up-to-date spec.

## Ready to merge

If no issues are found, the summary should state that clearly and then proceed to ask if the user wants to create a merge request or make further changes.
