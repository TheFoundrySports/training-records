---
description: TypeScript naming conventions — handle/on prefix for events, is prefix for booleans, no any.
globs: "**/*.ts, **/*.tsx"
alwaysApply: false
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# Typescript Rules

## Always

- Event functions should be named with a “handle” or "on" prefix, like “handleClick” for onClick and “handleKeyDown” for onKeyDown.
- Boolean functions to get boolean states should be named with "is" prefix, like "isActive" to check active boolean or "isClosed" for closed.
- Use generics for reusable type patterns.
- Use consts instead of functions, for example, “const toggle = () =>”. Also, define a type if possible.
- Prefer async/await over Promises.

## Never

- NEVER use `any`, prefer `unknown` for unknown types.
