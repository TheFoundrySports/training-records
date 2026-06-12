# Proposal: Fix CI/CD lint errors and establish local lint-before-commit workflow

> **Source**: Engram #470 (sdd/Fix error I see in CI/CD and also find a way to avoid lint errors in github CI/CD./proposal)

## Intent

CI fails at the Lint step (`npm run lint` → `eslint .`) before unit tests run. Two trivial `@typescript-eslint/no-unused-vars` errors in test files block all PRs. There is no local guardrail—developers only discover lint failures in GitHub Actions.

## Problem Statement

| Issue | Location | Cause |
|-------|----------|-------|
| Unused import | `AcceptInvitePage.test.tsx:4` | Leftover `ReactNode` import after refactor |
| Unused variable | `BJJSectionEditor.test.tsx:252` | `userEvent.setup()` declared but test uses `fireEvent.click` |

No pre-commit hooks exist (`husky`, `lint-staged`, or alternatives). `docs/STANDARDS.md` documents CI-only linting.

## Goals

- Unblock CI by fixing both ESLint errors
- Catch lint issues locally before push via husky + lint-staged
- Document the workflow in `docs/STANDARDS.md`

## Non-Goals

- Full-project lint on every commit (too slow)
- Commit-msg hook enforcement
- Wiring `eslint-config-prettier` or adding Prettier to hooks
- Fixing non-blocking warnings (`WorkoutFormPage.tsx` incompatible-library, coverage noise)
- Changing CI workflow structure or ESLint rule severity

## Proposed Solution

### 1. Immediate CI fix (~2 lines)

1. Remove unused `ReactNode` import from `AcceptInvitePage.test.tsx`
2. Remove unused `const user = userEvent.setup()` from `BJJSectionEditor.test.tsx`
3. Verify with `npm run lint`

### 2. Pre-commit workflow (husky + lint-staged)

- Add `husky` and `lint-staged` as devDependencies
- Add `"prepare": "husky"` to `package.json` scripts
- Configure lint-staged: `"*.{ts,tsx}": ["eslint --fix"]`
- Create `.husky/pre-commit` → `npx lint-staged`

### 3. Optional hardening

- Add `coverage` to `eslint.config.js` `globalIgnores` (reduces local noise after `test:coverage`)
- Add `"lint:fix": "eslint . --fix"` script for manual full-project fixes

## Scope

| File | Change |
|------|--------|
| `src/features/auth/pages/__tests__/AcceptInvitePage.test.tsx` | Remove unused import |
| `src/features/bjj/__tests__/BJJSectionEditor.test.tsx` | Remove unused variable |
| `package.json` | devDeps, `prepare`, lint-staged config, optional `lint:fix` |
| `.husky/pre-commit` | New hook file |
| `docs/STANDARDS.md` | Document pre-commit lint workflow |
| `eslint.config.js` | Optional: add `coverage` to ignores |

## Approach

Minimal two-line lint fix first, then standard npm husky/lint-staged setup. lint-staged runs ESLint with `--fix` on staged `*.{ts,tsx}` only—fast feedback without full-project scan. CI remains the authoritative full-project lint gate.

## Success Criteria

- [x] `npm run lint` exits 0 locally and in CI
- [x] `git commit` with a staged `.ts`/`.tsx` file runs ESLint via lint-staged
- [x] `docs/STANDARDS.md` describes pre-commit hook and `--no-verify` bypass
- [x] `npm install` runs `prepare` and initializes husky without errors
- [ ] CI Lint step passes on PRs to `main`/`develop` (pending push)

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| lint-staged only checks staged files; cross-file issues slip through | Med | CI runs full `eslint .` on every PR |
| Developers bypass hook with `--no-verify` | Med | Document in STANDARDS; CI remains gate |
| `prepare` script fails in restricted install environments | Low | Standard husky pattern; document manual `npx husky` if needed |
| New contributors skip `npm install` prepare step | Low | CI catches; README/STANDARDS mention hooks |
| Coverage folder lint warnings locally | Low | Optional `coverage` in globalIgnores |

## Rollback Plan

1. Revert test-file changes (CI fails again—only if reintroducing errors)
2. Remove `.husky/pre-commit`, husky/lint-staged from `package.json`, and `prepare` script
3. Revert `docs/STANDARDS.md` changes
4. Run `npm install` to clean lockfile

No production runtime impact; rollback is a config revert.
