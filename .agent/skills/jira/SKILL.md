---
name: jira
description: >
  Use Jira CLI (jira-cli) to manage Jira issues, epics, and sprints.
  Trigger: When user wants to create, view, or update Jira issues from terminal.
---

# Jira CLI Skill

Interact with Atlassian Jira using the `jira-cli` command-line tool (https://github.com/ankitpokhrel/jira-cli).

This skill enables creating, viewing, updating, and managing Jira issues, epics, and sprints directly from the terminal.

---

## When to Use

Use this skill when:

* The user wants to manage Jira tickets/issues
* The user mentions Jira, tickets, issues, epics, or sprints
* Automating Jira workflows via CLI
* Querying assigned work or sprint progress
* Updating issue status, comments, or assignments

---

## Prerequisites

Ensure `jira-cli` is installed and configured, if not ask the user to install it.

Then initialize:

```bash
jira init
```

You will need:

* Jira host (e.g. your-domain.atlassian.net)
* Email
* API token

Environment variable (recommended):

```bash
export JIRA_API_TOKEN="your-token"
```

---

## Important Notes for AI Usage

* Always use `--plain` for machine-readable output
* Commands support POSIX-style flags and can be combined
* Works with Jira Cloud and self-hosted instances

---

## Core Commands

### List Issues

```bash
# All issues
jira issue list --plain

# Assigned to me
jira issue list -a$(jira me) --plain

# Filter by status
jira issue list -s"In Progress" --plain

# High priority issues
jira issue list -yHigh --plain
```

---

### View Issue

```bash
jira issue view ISSUE-123 --plain
```

---

### Create Issue

```bash
jira issue create \
  -pPROJECT \
  -tTask \
  -s"Title" \
  -b"Description"
```

Example:

```bash
jira issue create -pPROJ -tBug -s"Login fails" -b"Users cannot login"
```

---

### Update / Transition Issue

```bash
# Move issue to another status
jira issue move ISSUE-123 "In Progress"

# Assign issue
jira issue assign ISSUE-123 $(jira me)
```

---

### Comments

```bash
jira issue comment add ISSUE-123 -b"Working on this"
```

---

### Open in Browser

```bash
jira open ISSUE-123
```

---

### Sprint Management

```bash
# List sprints
jira sprint list --plain

# Current sprint
jira sprint list --current --plain
```

---

## Common Workflows

### Show My Work

```bash
jira issue list -a$(jira me) --plain
```

---

### Daily Standup

```bash
jira issue list -a$(jira me) -s"In Progress" --plain
```

---

### Find High Priority Tasks

```bash
jira issue list -yHigh --plain
```

---

### Create + Assign Issue

```bash
jira issue create -pPROJ -tTask -s"My Task" -b"Details"
jira issue assign ISSUE-123 $(jira me)
```

---

## Capabilities Overview

The CLI supports:

* Issue CRUD (create, view, edit, delete)
* Search with filters
* Sprint and epic navigation
* Comments and transitions
* Scriptable CLI workflows

---

## Tips

* Use `jira help` to explore commands
* Combine filters for powerful queries
* Use shell scripting for automation
* Use multiple configs via `--config` if working across projects

---

## Limitations

* Requires initial setup and API token
* CLI learning curve for new users
* Depends on Jira API availability

---

## Summary

`jira-cli` is a fast, scriptable way to manage Jira without leaving the terminal, supporting everything from issue creation to sprint tracking in a developer-friendly workflow.
