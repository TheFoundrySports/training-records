# Proposal: Workouts List — MUI Refactor

> **Change**: `workouts-list-mui`
> **Scope**: only `/workouts` list page (per user decision)

## Intent

The `/workouts` list page is the landing route for authenticated athletes (`/` redirects to `/workouts`). Today it is built on **shadcn/ui + Tailwind v4**, the project's default UI stack. We want to migrate this one page to **MUI v6** to validate Material as a viable visual system on a high-traffic page, without committing the rest of the workouts feature (form, detail) to the migration.

The migration preserves every existing behavior (type filter, loading skeleton, error state, empty state, list rendering, import/export buttons, query invalidation). Only the underlying component primitives change. Visual look may shift slightly toward Material idioms — the goal is consistency with the future BJJ dashboard (`/bjj/dashboard`), not pixel parity with the current shadcn version.

## Scope

### In Scope

- **Page rewrite**: `src/features/workouts/pages/WorkoutListPage.tsx` — replace shadcn primitives with MUI equivalents. Local subcomponents (`WorkoutCard`, `LoadingSkeleton`, `TypeFilter`) get rewritten to MUI; their test surface is preserved.
- **MUI theme infrastructure**: per-route MUI `ThemeProvider` mounted at the page boundary (not app-wide). Three new files:
  - `src/features/workouts/theme/material-tokens.ts` — typed light/dark palette mirroring existing shadcn CSS tokens
  - `src/features/workouts/theme/mui-workouts-theme.ts` — `createTheme()` factory consuming the tokens
  - `src/features/workouts/theme/renderWithMuiTheme.tsx` — test util wrapping children in `ThemeProvider`
- **Test updates**: `WorkoutListPage.test.tsx` switches to `renderWithMuiTheme`; new `renderWithMuiTheme.test.tsx` smoke test
- **Vite config**: add `@mui/material`, `@emotion/react`, `@emotion/styled` to `optimizeDeps.include`
- **Dark mode coexistence**: MUI `palette.mode` reads the existing shadcn `<html class="dark">` so the two systems stay in sync without a new `ThemeContext`

### Out of Scope (explicit)

- `WorkoutFormPage.tsx`, `WorkoutDetailPage.tsx` — stay on shadcn/Tailwind
- `ExportAllWorkoutsButton.tsx`, `ImportWorkoutsModal.tsx` — stay on shadcn (only used by the list page, but rewriting them pulls the migration outside its single-page scope)
- `useWorkouts.ts`, `workout.schema.ts`, `workout.types.ts` — data layer stays
- `router.tsx` route definition — no path/component change
- A unified `src/theme/ThemeContext.tsx` — deferred to a separate `theme-context-unified` change (the BJJ dashboard shipped a shim, but its files are not in this branch's working set)
- WorkoutTypePicker is already partially Material-styled, but it's not used by the workouts list — out of scope for this change

## Capabilities

### New Capabilities

- `workouts-list-ui`: MUI-rendered `/workouts` landing page with type filter, list, error/empty/loading states, import/export CTAs — same behavior, Material look.

### Modified Capabilities

None — no existing main spec to delta against.

## Approach

### Architecture sketch

```
<AppShell> (shadcn/Tailwind chrome)
  └── Outlet
        └── /workouts → <WorkoutListPage>
                          ├── <ThemeProvider theme={createWorkoutsTheme(mode)}>
                          │     ├── <DashboardTimeFilter equivalent> NOT NEEDED (this is the workouts list)
                          │     ├── <PageHeader>  ← MUI <Stack> + <Typography variant="h4">
                          │     ├── <TypeFilter> ← MUI <ToggleButtonGroup> + <ToggleButton>
                          │     ├── {isLoading  ? <Skeleton /> × 3 : null}
                          │     ├── {isError    ? <Alert severity="error" /> : null}
                          │     ├── {!workouts ? <EmptyState /> : null}
                          │     ├── {workouts  ? <MUI List>{workouts.map(WorkoutCard)}</MUI List> : null}
                          │     ├── <ExportAllWorkoutsButton> ← MUI <Button variant="outlined">
                          │     └── <ImportWorkoutsModal> (unchanged — shadcn)
```

### State management

- No new global state. `useState` for `filter` + `importModalOpen` stays local.
- `useWorkouts({ type: filter })` data hook unchanged.
- `queryClient.invalidateQueries({ queryKey: ['workouts'] })` after import unchanged.

### Theme coexistence (minimal)

- MUI theme uses `palette.mode` from `document.documentElement.classList.contains('dark')` (read once per render)
- No new toggle button, no new localStorage key, no `ThemeContext`
- The shadcn system (`<html class="dark">`) continues to drive everything; MUI follows

### Bundle strategy

- Keep `WorkoutListPage` as a direct import (not lazy-loaded)
- Rationale: `/workouts` is the auth landing route — every logged-in user hits it on first paint; splitting via `React.lazy` would force a skeleton flash on every login
- MUI's `@mui/material` is already optimized via Vite tree-shaking; the `@emotion/*` peer deps add ~20KB gzipped — acceptable for the landing page
- Tradeoff: if the user later complains about initial bundle size, splitting is one refactor away

### Test strategy (strict TDD)

For each new file: failing test first → minimum pass → refactor.

- `renderWithMuiTheme.test.tsx` — smoke test that child renders inside ThemeProvider
- `WorkoutListPage.test.tsx` — same 11-test coverage, swap wrapper from inline `MemoryRouter` + `QueryClientProvider` to `renderWithMuiTheme` + `MemoryRouter` + `QueryClientProvider`
- New test cases (TDD):
  - "TypeFilter uses MUI ToggleButtonGroup with aria-pressed semantics"
  - "WorkoutCard renders MUI Chip for type label"
  - "LoadingSkeleton uses MUI Skeleton"
  - "Error state uses MUI Alert with role=alert"
  - "Empty state uses MUI Stack + Button"
- Existing E2E specs (`e2e/workout-with-format.spec.ts`, `e2e/load-workout.spec.ts`) must still pass without changes

## Resolved decisions

| # | Question | Decision | Justification |
| --- | --- | --- | --- |
| 1 | Typography | Use Geist (project standard, `@fontsource-variable/geist`) | Visual consistency with the rest of the app. Roboto would create a typography split between `/workouts` and other routes. |
| 2 | Dark mode coexistence | MUI reads shadcn's `.dark` class on `<html>` | No new infrastructure (no `ThemeContext`, no localStorage). Two systems stay in sync via the existing CSS. Defer unified context to a separate change. |
| 3 | Bundle strategy | Direct import, no `React.lazy` | `/workouts` is the landing route; a skeleton flash on every login is worse UX than the ~20KB MUI cost. |
| 4 | Export/Import buttons | Stay shadcn (`ExportAllWorkoutsButton`, `ImportWorkoutsModal` unchanged) | Only used by this page, but rewriting them expands scope. The list page can call shadcn Button components inside an MUI subtree — MUI/shadcn don't fight at the DOM level for shadcn `Button` rendering. |

## Affected Areas

| Area | Impact | Description |
| --- | --- | --- |
| `src/features/workouts/pages/WorkoutListPage.tsx` | Rewritten | shadcn → MUI |
| `src/features/workouts/pages/WorkoutListPage.test.tsx` | Modified | New wrapper, same coverage |
| `src/features/workouts/theme/material-tokens.ts` | New | Typed light/dark palette |
| `src/features/workouts/theme/mui-workouts-theme.ts` | New | `createTheme()` factory |
| `src/features/workouts/theme/renderWithMuiTheme.tsx` | New | Test util |
| `src/features/workouts/theme/__tests__/renderWithMuiTheme.test.tsx` | New | Smoke test |
| `vite.config.ts` | Modified | Add MUI to `optimizeDeps.include` |
| `src/app/router.tsx` | Unchanged | Route definition stays |
| `src/features/workouts/components/ExportAllWorkoutsButton.tsx` | Unchanged | Out of scope |
| `src/features/workouts/components/ImportWorkoutsModal.tsx` | Unchanged | Out of scope |

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| MUI/shadcn CSS collision on the page | Low | MUI's `CssBaseline` is **not** mounted (page is inside existing shadcn `AppShell`); MUI components use `sx` props that don't collide with Tailwind classes used by `AppShell` chrome |
| Initial bundle grows ~20KB gzipped | Medium | Acceptable trade-off for the landing route. If size becomes a regression, split via `React.lazy` in a follow-up. |
| Visual regression vs shadcn version | Medium | Manual visual review in PR; pixel parity is NOT the goal. Behavior parity is required (same filters, same error/empty/loading states, same query invalidation). |
| MUI theme tokens drift from shadcn tokens over time | Low | Single `material-tokens.ts` source — manual sync required if shadcn theme changes. Document in `docs/features/workouts-list-mui.md`. |
| Existing E2E tests break because of role changes | Low | E2E specs use semantic queries (`getByRole`); MUI components map to standard roles (`button`, `list`, `listitem`). |

## Acceptance criteria

- [ ] `/workouts` renders using MUI components (no shadcn primitives in this page after merge)
- [ ] Type filter (All/CrossFit/Functional/BJJ) functional, with `aria-pressed` semantics preserved
- [ ] Loading skeleton appears during fetch
- [ ] Error state appears on fetch failure (red, `role="alert"`)
- [ ] Empty state appears when no workouts (with "Log workout" CTA)
- [ ] List rendering: clicking a card navigates to `/workouts/:id`
- [ ] Export button works (CSV download)
- [ ] Import button opens `ImportWorkoutsModal` and invalidates `['workouts']` on success
- [ ] Dark mode: MUI `palette.mode` matches shadcn's `<html class="dark">` toggle
- [ ] All 11 existing unit tests still pass (now wrapped in `renderWithMuiTheme`)
- [ ] Existing E2E specs (`e2e/workout-with-format.spec.ts`, `e2e/load-workout.spec.ts`) pass without changes
- [ ] `pnpm run lint` clean on new files
- [ ] `pnpm exec tsc --noEmit` clean
- [ ] No `workouts` feature files outside the page + theme + tests touched

## Rollback Plan

1. `git revert` the merge commit on `feat/workouts-list-mui` → reverts `WorkoutListPage.tsx` + theme files + tests to shadcn
2. Delete `src/features/workouts/theme/` (3 files) — no other code depends on them
3. Revert `vite.config.ts` (remove MUI from `optimizeDeps.include`)
4. No DB migrations involved
5. No behavior change for users — the shadcn list page renders identically to before this change

## Dependencies

- `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled` already installed (verified)
- `useWorkouts` data hook stable
- Route definition in `router.tsx` unchanged
- Existing shadcn CSS variables in `src/index.css` (read-only consumption for theme tokens)

## Success Criteria

- [ ] All acceptance criteria above pass
- [ ] `pnpm test` green
- [ ] `pnpm run test:e2e` green
- [ ] `pnpm run lint` clean on new files
- [ ] `pnpm run build` succeeds
- [ ] No shadcn primitives in `WorkoutListPage.tsx` after merge
- [ ] PR diff ≤ 400 lines (this change is tight enough to fit one PR; no chaining needed)

## Follow-up change

- **`theme-context-unified`** — introduce `src/theme/ThemeContext.tsx` with `light | dark | system` mode + `localStorage` + `<IconButton>` toggle in `AppShell`. MUI in both `/workouts` and `/bjj/dashboard` reads from the unified context. Tracked separately to keep this PR scope focused.
- **`workout-detail-mui` / `workout-form-mui`** — if the user wants the rest of the workouts feature on MUI, separate follow-ups.

## Traceability

| Artifact | Location |
| --- | --- |
| GitHub issue | (none yet — user-driven refactor) |
| Explore | `openspec/changes/workouts-list-mui/explore.md` |
| Proposal | `openspec/changes/workouts-list-mui/proposal.md` |
| Design | `openspec/changes/workouts-list-mui/design.md` |
| Specs | `openspec/changes/workouts-list-mui/specs/workouts-list-ui/spec.md` |
| Tasks | `openspec/changes/workouts-list-mui/tasks.md` |
| Apply progress | `openspec/changes/workouts-list-mui/apply-progress.md` |
