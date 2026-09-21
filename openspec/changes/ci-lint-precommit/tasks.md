# Tasks: Fix CI/CD Lint Errors and Establish Local Lint-Before-Commit Workflow

## Review Workload Forecast

| Field                   | Value                          |
| ----------------------- | ------------------------------ |
| Estimated changed lines | ~50–70 (additions + deletions) |
| 400-line budget risk    | Low                            |
| Chained PRs recommended | No                             |
| Suggested split         | Single PR                      |
| Delivery strategy       | ask-on-risk                    |
| Chain strategy          | N/A — single PR                |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal                                  | Likely PR | Notes                              |
| ---- | ------------------------------------- | --------- | ---------------------------------- |
| 1    | All 6 file changes in one cohesive PR | PR 1      | Self-contained; no chaining needed |

---

## Phase 1: ESLint Error Fixes (Unblock CI)

- [ ] 1.1 In `src/features/auth/pages/__tests__/AcceptInvitePage.test.tsx` line 4, remove `type { ReactNode }` from the import statement
- [ ] 1.2 In `src/features/bjj/__tests__/BJJSectionEditor.test.tsx` ~line 252, remove unused `const user = userEvent.setup()` declaration
- [ ] 1.3 Run `npm run lint` locally and verify exit code 0 with no errors in those two files

## Phase 2: ESLint Hardening

- [ ] 2.1 In `eslint.config.js`, add `'coverage'` to the `globalIgnores` array alongside existing entries (`'dist'`, `'docs/oldcode'`, `'supabase/functions'`)
- [ ] 2.2 In `package.json` scripts, add `"lint:fix": "eslint . --fix"`

## Phase 3: Pre-commit Hook Setup

- [ ] 3.1 Install devDependencies: `npm install --save-dev husky lint-staged`
- [ ] 3.2 In `package.json` scripts, add `"prepare": "husky"`
- [ ] 3.3 In `package.json`, add `"lint-staged"` config block: `{ "*.{ts,tsx}": ["eslint --fix"] }`
- [ ] 3.4 Create `.husky/pre-commit` as an executable shell script containing `npx lint-staged`
- [ ] 3.5 Run `npm run prepare` to install the hook into `.git/hooks/pre-commit`

## Phase 4: Documentation

- [ ] 4.1 In `docs/STANDARDS.md`, add a linting section documenting: pre-commit hook behavior, `git commit --no-verify` bypass, `npm run lint:fix` usage, and CI as the authoritative full-project gate

## Phase 5: Verification

- [ ] 5.1 Stage a `.tsx` file with a fixable lint issue, run `git commit`, verify hook auto-fixes and commit proceeds
- [ ] 5.2 Stage a `.tsx` file with an unfixable lint error, run `git commit`, verify commit is blocked with ESLint output
- [ ] 5.3 Stage a non-TypeScript file (`.md`), run `git commit`, verify no lint tasks fire and commit proceeds
- [ ] 5.4 Clone a fresh copy (or simulate) and run `npm install`; verify `.git/hooks/pre-commit` is present
- [ ] 5.5 Run `npm run lint` on the full project and confirm exit code 0
