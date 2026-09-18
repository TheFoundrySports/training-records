# Archive Report: workouts-list-mui

**Change:** workouts-list-mui
**Full name:** Migrate workouts list page (`/workouts`) from shadcn/Tailwind to MUI v6
**Archived:** 2026-09-15
**Branch:** `feat/workouts-list-mui`
**Worktree:** /Users/fran/Foundry/training-records

---

## Engram Observation IDs (Traceability)

| Artifact | Engram ID | Topic Key |
| --- | --- | --- |
| Proposal | TBD | sdd/workouts-list-mui/proposal |
| Spec | TBD | sdd/workouts-list-mui/spec |
| Design | TBD | sdd/workouts-list-mui/design |
| Tasks | TBD | sdd/workouts-list-mui/tasks |
| Verify Report | TBD | sdd/workouts-list-mui/verify-report |

---

## Specs Synced

| Domain | Action | Details |
| --- | --- | --- |
| workouts-list-ui | Created | New spec — 12 requirements covering per-route MUI theme provider, theme tokens tracing to shadcn CSS vars, page header, type filter, loading skeleton, error state, empty state, workout card list rendering, export button coexistence, test wrapper, vite optimizeDeps, strict TDD compliance |

**Main spec written to:** `openspec/specs/workouts-list-ui/spec.md` (not synced — domain is new and spec lives in change folder)

---

## Archive Contents

- `explore.md` ✅ — reuse surface (WorkoutListPage, MUI infra already installed, shadcn theme tokens) + open questions
- `proposal.md` ✅ — intent + scope + 4 resolved decisions (Geist typography, MUI reads shadcn dark class, direct import, Export/Import stay shadcn)
- `design.md` ✅ — component-by-component rewrite map + theme factory design + Vite config + rollout
- `tasks.md` ✅ — 7-commit strict-TDD plan + verification gates
- `specs/workouts-list-ui/spec.md` ✅ — 12 requirements with scenarios
- No `verify-report.md` — verify artifacts captured here directly

---

## Task Completion Summary

| Phase | Tasks | Status |
| --- | --- | --- |
| Phase 1: Theme Infrastructure | 5/5 | ✅ Complete |
| Phase 2: Page Rewrite (RED→GREEN) | 9/9 | ✅ Complete |
| Phase 3: Verification Gates | 3/4 | ✅ Complete (P3.4 manual smoke deferred to post-merge checklist) |

**Total**: 17/18 tasks complete (P3.4 manual smoke deferred — no automated coverage).

---

## Verification Summary

**Verdict:** PASS

| Check | Result |
| --- | --- |
| `pnpm test src/features/workouts` | ✅ 150/150 pass (17 files) |
| `pnpm exec eslint src/features/workouts` | ✅ 0 errors (1 pre-existing warning in `WorkoutFormPage.tsx` — not introduced by this change) |
| `pnpm exec tsc --noEmit` | ✅ 0 errors |
| `pnpm run build` | ✅ succeeds (351 kB gz main bundle, +~20 KB from MUI/emotion peer deps) |

**Programmatic:** all checks pass.
**Manual:** P3.4 deferred — see "Pending Before Merge" below.

---

## What Was Delivered

1. **MUI theme infrastructure (3 new files + 1 test util + 1 test)**:
   - `material-tokens.ts` — typed MUI palette for both light and dark modes, every color traced to a shadcn CSS variable with per-line comment
   - `mui-workouts-theme.ts` — `createTheme()` factory + `readShadcnDarkMode()` helper (reads `<html class="dark">`)
   - `renderWithMuiTheme.tsx` — test util wrapping children in `<ThemeProvider>` + `<CssBaseline>`
   - `renderWithMuiTheme.test.tsx` — 3 smoke tests
2. **WorkoutListPage rewrite**: full migration from shadcn/Tailwind to MUI v6 — `Container`, `Stack`, `Typography`, `ToggleButtonGroup`, `Card`, `Chip`, `Alert`, `Skeleton`, `List`, `ListItem`, `Button`. Per-route `ThemeProvider` mount. Test assertions updated for MUI selectors.
3. **Tests**: 150/150 pass. Added 2 new tests: "renders four filter toggle buttons" (verifies MUI `ToggleButtonGroup` aria semantics) and "filters by CrossFit when that toggle is clicked" (verifies state change flows to `useWorkouts`).

---

## Pending Before Merge

| # | Action | Owner |
| --- | --- | --- |
| P1 | Manual smoke checklist from `tasks.md` P3.4 | Developer |
| P2 | Push branch `feat/workouts-list-mui` | Developer |
| P3 | Create PR | Developer |
| P4 | Optional: verify dark mode toggle visually | Developer |
| P5 | Optional: measure landing-page TTI before/after | Developer |

---

## Source of Truth Updated

No main spec was modified — this is a new domain (`workouts-list-ui`). The spec lives in the change folder per SDD convention.

---

## SDD Cycle Status

All implementation phases complete. Verification: PASS. Change archived. Pending items are pre-merge operational steps.

**The SDD cycle is closed for this change.**
