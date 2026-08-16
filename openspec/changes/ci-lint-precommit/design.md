# Design: Fix CI/CD Lint Errors and Establish Local Lint-Before-Commit Workflow

## Technical Approach

Two-phase delivery: (1) remove 2 trivial unused-variable ESLint errors in test files to unblock CI immediately; (2) install husky v9 + lint-staged and configure a pre-commit hook that runs `eslint --fix` on staged `*.{ts,tsx}` files only. Add `coverage/` to `globalIgnores` and a `lint:fix` convenience script as optional low-risk hardening.

## Architecture Decisions

| Decision | Choice | Alternatives Rejected | Rationale |
|----------|--------|-----------------------|-----------|
| Git hook manager | husky v9 | lefthook, simple-git-hooks, manual `.git/hooks` | Industry standard; `prepare` npm lifecycle is native; team familiarity assumed |
| Hook scope | lint-staged on staged `*.{ts,tsx}` only | Full `eslint .` on commit | Staged-only is fast; cross-file issues are caught by CI's full `eslint .` gate |
| Auto-fix in hook | `eslint --fix` | Error-only (no fix) | Auto-fix resolves trivial issues without blocking commit; remaining errors abort commit |
| ESLint v9 ignore for coverage | `globalIgnores(['coverage'])` | `.eslintignore` file | Flat config (v9) deprecates `.eslintignore`; `globalIgnores` is the correct API |

## Data Flow

```
git commit (staged *.ts, *.tsx)
       │
       └──→ .husky/pre-commit
                  │
                  └──→ npx lint-staged
                             │
                  ┌──────────┴──────────┐
                pass                  fail
                  │                     │
            commit proceeds        abort commit
                                  (errors printed)

CI (push / PR) — full authoritative gate:
  npm run lint  →  eslint .  →  all files, no --fix
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/auth/pages/__tests__/AcceptInvitePage.test.tsx` | Modify | Remove unused `type { ReactNode }` import (line 4) |
| `src/features/bjj/__tests__/BJJSectionEditor.test.tsx` | Modify | Remove unused `const user = userEvent.setup()` (line 252) |
| `package.json` | Modify | Add `husky` + `lint-staged` devDeps; add `prepare` and `lint:fix` scripts; add `lint-staged` config block |
| `.husky/pre-commit` | Create | Executable shell script: `npx lint-staged` |
| `eslint.config.js` | Modify | Add `'coverage'` to `globalIgnores` array |
| `docs/STANDARDS.md` | Modify | Document pre-commit lint hook, `--no-verify` bypass, and `lint:fix` script |

## Interfaces / Contracts

```jsonc
// package.json — additions
{
  "scripts": {
    "prepare": "husky",
    "lint:fix": "eslint . --fix"
  },
  "devDependencies": {
    "husky": "^9.x.x",
    "lint-staged": "^16.x.x"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix"]
  }
}
```

```sh
# .husky/pre-commit
npx lint-staged
```

```js
// eslint.config.js — globalIgnores update
globalIgnores(['dist', 'docs/oldcode', 'supabase/functions', 'coverage'])
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Manual | `npm run lint` exits 0 | Run locally after fixing test files |
| Manual | Pre-commit hook fires on staged `.tsx` | Stage any `.tsx`, run `git commit` |
| Manual | Hook auto-fixes and passes clean file | Stage file with fixable whitespace issue |
| CI | Lint step green | Push branch, verify GitHub Actions Lint step |

## Migration / Rollout

No migration required. `npm install` after merging triggers the `prepare` script which runs `husky` and installs the hook into `.git/hooks/pre-commit`. No existing hooks are overwritten (none exist).

## Open Questions

None — proposal resolved all open points. Including optional hardening (`coverage` ignore + `lint:fix` script) in same PR as confirmed low-risk.
