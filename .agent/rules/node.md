---
description: Node.js version management — use nvm and respect .nvmrc before running npm commands.
globs: "package.json, .nvmrc, **/*.js, **/*.ts, **/*.mjs, **/*.cjs"
alwaysApply: false
paths:
  - "package.json"
  - ".nvmrc"
  - "**/*.js"
  - "**/*.ts"
  - "**/*.mjs"
  - "**/*.cjs"
---

# Node.js Rules

## Always

- Always check for nvm availability before running Node.js or npm commands
- Always run `nvm use` to activate the correct Node.js version before any Node.js operations if nvm is available
- Always respect the project's `.nvmrc` file when present for the required Node.js version
  - If `.nvmrc` is not available, verify the active Node.js version meets the project's requirements before proceeding
  - If `nvm use` fails because the version is not installed, run `nvm install` first, then retry `nvm use`
  - If `nvm install` is not possible, verify the currently active Node.js version is compatible with the project requirements before proceeding anyway
