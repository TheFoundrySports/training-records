# AGENTS.md

Agent context for TheFoundry projects.

## General behavior

Project-specific standards live in [.agent/rules/](.agent/rules) — they are always active.

- Do not hallucinate or assume information about the project. If you don't know, if not clear, ask the user for clarifications.
- Keep generated text concise and on point.
- Detect and use project tools freely: `npm`, `composer`, `ddev`, `git`, `glab`/`gh`/`az`, browser, web.
- Always run commands as separate tool calls — never chain them with `&&` or `;`. The allow-list in `.claude/settings.json` matches on command prefix, so chaining triggers a permission prompt.

## Quick Start

See [README.md](README.md) for installation and setup instructions.

## Product Overview

Check [Product](docs/PRODUCT.md) docs to understand the product vision.

## Project Structure

Check [Architecture](docs/ARCHITECTURE.md) docs to understand the system design.

## Additional Context

Check [Standards](docs/STANDARDS.md) docs for company technical standards.

## Feature planning

Feature planning is handled via the `/plan` workflow.

## Review

Verification is handled via the `/review` workflow.

## Merge / Pull Requests

Use the `/create-mr` workflow to create MRs or PRs after review.
