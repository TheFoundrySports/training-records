# CI Lint Specification

**Domain:** ci-lint
**Source change:** ci-lint-precommit
**Date:** 2026-06-12

## Purpose

Requirements covering the project's ESLint enforcement strategy:
1. ESLint errors resolved to keep CI green
2. A pre-commit hook that catches lint issues before push
3. Developer workflow documentation

---

## Requirements

### Requirement: Test File ESLint Errors Resolved

The repository MUST have zero `@typescript-eslint/no-unused-vars` errors in
`AcceptInvitePage.test.tsx` and `BJJSectionEditor.test.tsx`.

#### Scenario: CI lint step passes after fix

- GIVEN `src/features/auth/pages/__tests__/AcceptInvitePage.test.tsx` contains an unused `ReactNode` import
- AND `src/features/bjj/__tests__/BJJSectionEditor.test.tsx` contains an unused `const user = userEvent.setup()`
- WHEN both declarations are removed
- THEN `pnpm run lint` exits with code 0
- AND the GitHub Actions Lint step passes on the next PR

#### Scenario: Lint remains clean after fix

- GIVEN the two unused declarations have been removed
- WHEN `pnpm run lint` is executed on the repository
- THEN no ESLint errors are reported for those files
- AND no regressions are introduced in other files

---

### Requirement: Pre-commit Hook Enforces Staged-file Lint

The repository MUST install `husky` and `lint-staged` as devDependencies.
`git commit` on any staged `*.{ts,tsx}` file SHALL trigger `eslint --fix` via
lint-staged. Commits that still have unfixable lint errors after auto-fix MUST
be blocked.

#### Scenario: Developer commits a file with auto-fixable lint error

- GIVEN a developer stages a `.ts` or `.tsx` file with a fixable ESLint error
- WHEN they run `git commit`
- THEN lint-staged runs `eslint --fix` on the staged file
- AND the fix is applied in-place
- AND the commit proceeds if no remaining errors

#### Scenario: Developer commits a file with unfixable lint error

- GIVEN a developer stages a `.ts` or `.tsx` file with an unfixable ESLint error
- WHEN they run `git commit`
- THEN lint-staged runs `eslint --fix`
- AND the error remains after attempted fix
- AND the commit is blocked with a non-zero exit code
- AND the developer sees the ESLint output in the terminal

#### Scenario: Commit with no TypeScript files is unaffected

- GIVEN a developer stages only non-`*.{ts,tsx}` files (e.g. `.md`, `.json`)
- WHEN they run `git commit`
- THEN lint-staged runs no ESLint tasks
- AND the commit proceeds normally

#### Scenario: Hook is initialized after pnpm install

- GIVEN a developer clones the repository and runs `pnpm install`
- WHEN the `prepare` lifecycle hook runs
- THEN husky installs the `.husky/pre-commit` hook
- AND subsequent `git commit` calls invoke lint-staged

#### Scenario: Developer bypasses hook intentionally

- GIVEN a developer needs to commit without running lint
- WHEN they run `git commit --no-verify`
- THEN lint-staged is skipped
- AND CI still runs the full `pnpm run lint` on the PR

---

### Requirement: Developer Workflow Documentation Updated

`docs/STANDARDS.md` MUST document the pre-commit lint hook, how it works, and
how to bypass it when necessary. It SHOULD also note that CI is the
authoritative full-project lint gate.

#### Scenario: New developer reads STANDARDS.md about lint workflow

- GIVEN a developer opens `docs/STANDARDS.md`
- WHEN they read the linting section
- THEN they learn that lint-staged auto-fixes staged `*.{ts,tsx}` files on commit
- AND they learn that `git commit --no-verify` bypasses the hook
- AND they understand CI still enforces full-project lint on PRs

---

### Requirement: Optional ESLint Hardening (MAY)

`eslint.config.js` MAY add `coverage` to `globalIgnores` to suppress ESLint
noise from generated coverage output. `package.json` MAY include a
`"lint:fix": "eslint . --fix"` script for manual full-project fixes.

#### Scenario: Coverage output does not trigger lint warnings

- GIVEN `coverage` is added to `globalIgnores` in `eslint.config.js`
- WHEN `pnpm run lint` is executed after `pnpm run test:coverage`
- THEN no ESLint warnings are reported for files under `coverage/`

#### Scenario: Developer runs full-project auto-fix

- GIVEN `"lint:fix": "eslint . --fix"` is present in `package.json` scripts
- WHEN a developer runs `pnpm run lint:fix`
- THEN ESLint applies auto-fixes across the entire project
- AND exits 0 if no unfixable errors remain
