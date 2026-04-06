---
description: Create a merge request after ensuring code is committed, reviewed, and pushed
disable-model-invocation: true
argument-hint: "[quick]"
---

# Merge Request Workflow

Create a merge/pull request with proper preparation and validation.
This workflow supports **GitLab** (glab), **Azure DevOps** (az), and **GitHub** (gh).

## Phase 0: Detect Platform

Detect the platform from the git remote URL:

```bash
git remote -v
```

- If the remote contains `gitlab` or known GitLab hosts → use `glab` commands
- If the remote contains `dev.azure.com` → use `az` commands
- If the remote contains `github.com` → use `gh` commands
- If unclear, ask the user which platform to use

For Azure DevOps, also ensure defaults are configured:

```bash
az devops configure --defaults organization=https://dev.azure.com/ORG project=PROJECT
```

## Phase 1: Pre-flight Checks

### 1.1 Check for Uncommitted Changes

Run `git status` to check the working directory.

**If there are uncommitted changes:**

> "You have uncommitted changes. Let's handle them first."

Ask the user:

- "Should I commit these changes now?"
- "Would you like to review them first?"

If committing:

1. Show `git diff` summary
2. Ask for commit message or suggest one based on changes
3. Run `git add .` and `git commit -m "message"`

### 1.2 Check Current Branch

Run `git branch --show-current` to get the current branch.

**If on main/master/develop:**

> "⚠️ You're on the `[branch]` branch. MRs should be created from feature or fix branches."
>
> Would you like to:
>
> 1. Create a new branch from your current changes
> 2. Abort and switch branches manually

### 1.3 Run Review Workflow

Before creating the MR, perform a quick review:

> "Let me do a quick review of your changes before creating the MR..."

Execute the `/review` workflow checks:

- Check for debug statements, console.logs
- Check for TODO comments
- Verify tests pass (if configured)
- Run linters (if configured)

**If issues found:**

> "I found some issues that should be addressed before creating the MR:"
> [List issues]
>
> Would you like to:
>
> 1. Fix these issues now
> 2. Create the MR anyway (not recommended)
> 3. Abort

## Phase 2: Push Changes

### 2.1 Check Remote Status

Run `git status -sb` to check if branch is ahead of remote.

**If branch has unpushed commits:**

> "You have [N] unpushed commit(s). Pushing to remote..."

Run `git push -u origin HEAD`

### 2.2 Verify Push Success

Confirm the push succeeded before proceeding.

## Phase 3: Prepare MR Details

### 3.1 Gather MR Information

Gather information for the title, description, test steps ... then ask the user:

> "Let's prepare your merge request. I'll need a few details:"

1. **Title** (suggest based on branch name or commits):

   > "Suggested title: `#[issue-number]-[type]: [description from branch/commits]`"
   > "Would you like to use this or provide a different title?"

2. **Description**:

   > "Please provide a brief description of the changes, or I can generate one from the commit messages."

3. **Test Steps**:
   > "Please provide a brief description of how to test the changes and validate them, or I can generate them too."

### 3.2 Get Assignee (Optional)

Ask the user:

> "Would you like to assign this MR to someone for review?"

**If yes:**

**GitLab:**

1. Fetch project members:

   ```bash
   glab api projects/:id/members/all --paginate
   ```

2. Show available members and ask who to assign.

**Azure DevOps:**

1. Fetch team members:

   ```bash
   az devops team list-member --team "Team Name"
   ```

2. Show available members and ask who to assign.

**GitHub:**

1. Fetch collaborators:

   ```bash
   gh api /repos/:owner/:repo/collaborators --jq '.[].login'
   ```

2. Show available members and ask who to assign.

If no answer, assign to the user themself.

### 3.3 Get Reviewer (Optional)

> "Would you like to request a review from someone? (Enter username or leave blank)"

Use same member lookup as assignee.

### 3.4 Labels (Optional)

> "Would you like to add any labels? (comma-separated, or leave blank)"

**GitLab:**

```bash
glab label list
```

**Azure DevOps:** Labels are passed with `--labels` on PR create.

**GitHub:**

```bash
gh label list
```

## Phase 4: Create Merge Request

### 4.1 Build and Execute Command

**GitLab:**

```bash
glab mr create \
  --source-branch <current-branch> \
  --target-branch main \
  --title "#number-type: description" \
  --description "### Summary

[Description here]

### Test instructions

[Test instructions here]

Relates to #123" \
  --assignee username \
  --reviewer username \
  --label "label1,label2" \
  --yes
```

**Azure DevOps:**

```bash
az repos pr create \
  --title "#number-type: description" \
  --description "### Summary

[Description here]

### Test instructions

[Test instructions here]" \
  --source-branch feature-branch \
  --target-branch main \
  --project PROJECT \
  --reviewers username \
  --labels "label1 label2" \
  --output table
```

**GitHub:**

```bash
gh pr create \
  --base main \
  --head <current-branch> \
  --title "#number-type: description" \
  --body "### Summary

[Description here]

### Test instructions

[Test instructions here]

Relates to #123" \
  --assignee username \
  --reviewer username \
  --label "label1,label2"
```

If considered necessary also add a Notes section with concerns or additional information.

### 4.2 Capture Result

Run the command and capture the MR/PR URL.

**If successful:**

> "✅ **Merge Request Created!**
>
> **Title:** [title]
> **URL:** [MR/PR URL]
> **Assignee:** @[username]
> **Reviewer:** @[username]
>
> The MR is ready for review. You can view it at:
> [MR/PR URL]"

**If failed:**

> "❌ Failed to create MR: [error message]"
>
> Common issues:
>
> - MR/PR already exists for this branch
> - No commits between source and target branch
> - Permission issues

Offer to help troubleshoot.

## Phase 5: Post-Creation

### 5.1 Check Pipeline

> "Checking CI pipeline status..."

**GitLab:**

```bash
glab ci status
```

**Azure DevOps:**

```bash
az pipelines runs list --branch <branch> --top 1 --output table
```

**GitHub:**

```bash
gh run list --branch <branch> --limit 1
```

Report pipeline status.

### 5.2 Summary

Provide final summary:

> "## MR Summary
>
> - **Branch:** [branch] → [target]
> - **MR/PR:** [URL]
> - **Pipeline:** [status]
> - **Assignee:** @[username]
> - **Reviewer:** @[username]
>
> **Next steps:**
>
> - Wait for pipeline to pass
> - Address any review feedback
> - Merge when approved"

## Quick Mode

If user runs `/create-mr` with arguments like `/create-mr quick` or `/create-mr --quick`:

Skip optional prompts and use defaults:

- Auto-generate title from branch name
- Auto-generate description from commits
- No assignee/reviewer
- No labels

**GitLab:**

```bash
glab mr create --fill --yes
```

**Azure DevOps:**

```bash
az repos pr create --source-branch HEAD --target-branch main --project PROJECT --output table
```

**GitHub:**

```bash
gh pr create --fill
```

## Error Handling

- If `glab`/`az`/`gh` is not authenticated, help authenticate and check if user did run the `/setup` workflow
- If remote is not set, help configure it
- If target branch doesn't exist, ask user to specify
- Always provide clear error messages and recovery options

## Notes for Agent

- **Never use `--related-issue` on `glab mr create`** — it silently overrides the source branch. Reference issues in the description instead (e.g. `Relates to #123`)
- Always pass `--source-branch` and `--target-branch` explicitly to avoid surprises
- Be efficient - don't ask unnecessary questions
- Suggest sensible defaults based on context
- Use commit history to generate good titles/descriptions
- Check if draft MR/PR is preferred for WIP code
- Auto-detect the platform once at the start, don't ask again
