---
description: Rules for collecting user input during interactive workflows using AskUserQuestion.
alwaysApply: true
---

# Interviewing Rules

Applies when collecting input from the user during interactive workflows (e.g. `/plan`, `/setup`, `/setup-docs`, `/document-project`).

## Always

- Use the `AskUserQuestion` tool when interviewing the user — it provides structured input and a better UX than plain chat text.
- Batch related questions into a single `AskUserQuestion` call (max 4 questions per call, 2–4 options each).
- If `AskUserQuestion` is not available (e.g. non-Claude Code environments), use the environment equivalent or fall back to plain text questions.
- Prefer `multiSelect: true` when multiple choices are valid and not mutually exclusive.
- Add an `(Recommended)` suffix to the preferred option when one option is clearly better.

## Never

- Never ask more than 4 questions in a single `AskUserQuestion` call.
- Never ask questions one-by-one when they can be batched into a single call.
- Never use `AskUserQuestion` for simple confirmations — plain text is fine for "Does this look good?" style follow-ups.
