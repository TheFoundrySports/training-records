# Tasks: Workouts List — MUI Refactor

> **Change**: `workouts-list-mui`
> **Spec**: `openspec/changes/workouts-list-mui/specs/workouts-list-ui/spec.md`
> **Design**: `openspec/changes/workouts-list-mui/design.md`
> **Test runner**: `pnpm test src/features/workouts` (Vitest strict TDD)

---

## Review Workload Forecast

| Field | Value |
| --- | --- |
| Estimated changed lines | ~350 (page rewrite ~150, theme ~120, tests ~80) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | exception-ok (auto mode — user wants progress) |
| Chain strategy | N/A — single PR |

```text
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: N/A
400-line budget risk: Low
```

---

## Phase 1: Theme Infrastructure (4 files)

### T1.1 — Define palette and tokens

**File**: `src/features/workouts/theme/material-tokens.ts`

- [x] Export `ThemeMode = 'light' | 'dark'`
- [x] Export `MuiPalette` interface with all required fields
- [x] Export `WorkoutTokens` interface (typography + radius)
- [x] Define `lightPalette` and `darkPalette` (every hex value has a comment naming the shadcn CSS var it derives from)
- [x] Export `palettes: Record<ThemeMode, MuiPalette>` and `tokensByMode`
- [x] Use Geist Variable for fontFamily (no Roboto)

**Acceptance**: `pnpm exec tsc --noEmit src/features/workouts/theme/material-tokens.ts` passes; every color matches its shadcn counterpart.

### T1.2 — Test util: RED

**File**: `src/features/workouts/theme/__tests__/renderWithMuiTheme.test.tsx`

- [ ] Test 1: `renderWithMuiTheme(<div data-testid="x" />)` renders the child
- [ ] Test 2: `renderWithMuiTheme(<ChildUsingTheme />, { mode: 'dark' })` — `ChildUsingTheme` reads `useTheme()` and `theme.palette.mode === 'dark'`

**Acceptance**: Tests fail because `renderWithMuiTheme` does not exist yet.

### T1.3 — Test util: GREEN

**File**: `src/features/workouts/theme/renderWithMuiTheme.tsx`

- [x] Export `renderWithMuiTheme(ui, options?)` function
- [x] `options.mode` defaults to `'light'`
- [x] Wrap children in `<ThemeProvider theme={createWorkoutsTheme(mode)}>` + `<CssBaseline />`
- [x] Re-export `RenderResult` type

**Acceptance**: `pnpm test src/features/workouts/theme/__tests__/renderWithMuiTheme.test.tsx` → 2 tests pass.

### T1.4 — Theme factory

**File**: `src/features/workouts/theme/mui-workouts-theme.ts`

- [x] Export `createWorkoutsTheme(mode: ThemeMode): Theme`
- [x] Use `createTheme` from `@mui/material/styles`
- [x] Apply palette + tokens from `material-tokens.ts`
- [x] Override typography (h4, body1, body2) and component defaults (MuiCard, MuiButton, MuiChip, MuiToggleButton)
- [x] Export `readShadcnDarkMode(): ThemeMode` (reads `document.documentElement.classList.contains('dark')`)

**Acceptance**: `pnpm exec tsc --noEmit` passes; manual test confirms light/dark modes produce distinct themes.

### T1.5 — Vite config

**File**: `vite.config.ts`

- [x] Add `@mui/material`, `@mui/material/styles`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled` to `optimizeDeps.include`

**Acceptance**: `pnpm dev` boots without "failed to optimize dep" warnings.

---

## Phase 2: Test Updates (RED → GREEN per subcomponent)

### T2.1 — Page test wrapper migration

**File**: `src/features/workouts/pages/__tests__/WorkoutListPage.test.tsx`

- [ ] Replace inline `MemoryRouter + QueryClientProvider` wrapper with `renderWithMuiTheme` (compose with the two providers)
- [ ] Update existing 11 test assertions to match new MUI selectors:
  - `getByRole('heading', { name: /workouts/i })` (h4 → heading role)
  - `getByRole('button', { name: /import/i })` (MUI button)
  - `getByRole('button', { name: /log workout/i })` (MUI button)
  - `getByRole('list', { name: /workout list/i })` (MUI List renders as `<ul>` with aria-label)
  - `getByRole('listitem')` (each workout)
  - Toggle buttons: `getByRole('button', { name: /^all$/i, pressed: true })` etc.

**Acceptance**: Tests fail (RED) — old shadcn selectors don't match new MUI DOM.

### T2.2 — Page rewrite: header + buttons

**File**: `src/features/workouts/pages/WorkoutListPage.tsx`

- [ ] Replace page header with MUI `<Stack>` + `<Typography variant="h4">`
- [ ] Replace action buttons with MUI `<Button>` (variants `outlined` + `contained`)
- [ ] Keep `ExportAllWorkoutsButton` (shadcn, unchanged) inside the MUI subtree

**Acceptance**: `pnpm test src/features/workouts/pages` → header test cases pass.

### T2.3 — Page rewrite: TypeFilter (ToggleButtonGroup)

**File**: `src/features/workouts/pages/WorkoutListPage.tsx`

- [ ] Replace `TypeFilter` body with MUI `<ToggleButtonGroup>` + 4 `<ToggleButton>`s
- [ ] Add `aria-label="Filter workouts by type"` to the group
- [ ] Guard `onChange` against `null` to keep filter sticky

**Acceptance**: `getByRole('button', { name: /crossfit/i, pressed: <bool> })` works; clicking active chip does NOT deselect.

### T2.4 — Page rewrite: LoadingSkeleton

**File**: `src/features/workouts/pages/WorkoutListPage.tsx`

- [ ] Replace 3 `<div>` with MUI `<Skeleton variant="rectangular" height={80} />`
- [ ] Wrap in MUI `<Box role="status" aria-label="Loading workouts">`

**Acceptance**: `getAllByTestId` (or query by role) finds 3 skeletons during loading.

### T2.5 — Page rewrite: Error state (Alert)

**File**: `src/features/workouts/pages/WorkoutListPage.tsx`

- [ ] Replace raw `<div role="alert">` with MUI `<Alert severity="error">`
- [ ] Use `<AlertTitle>` for "Failed to load workouts"
- [ ] Body shows parsed `error.message` or fallback string

**Acceptance**: `getByRole('alert')` finds the MUI Alert; body text matches input.

### T2.6 — Page rewrite: Empty state

**File**: `src/features/workouts/pages/WorkoutListPage.tsx`

- [ ] Replace raw centered text with MUI `<Stack alignItems="center">`
- [ ] Use `<Typography variant="body1" fontWeight={500}>` and `<Typography variant="body2" color="text.secondary">`
- [ ] Use MUI `<Button variant="contained">` for CTA

**Acceptance**: When `data.length === 0`, "No workouts yet" + "Log workout" button render.

### T2.7 — Page rewrite: WorkoutCard (Card + RouterLink + Chip)

**File**: `src/features/workouts/pages/WorkoutListPage.tsx`

- [ ] Replace `WorkoutCard` with MUI `<Card component={RouterLink}>`
- [ ] Use `<ListItem disablePadding>` wrapper
- [ ] Title: `<Typography variant="body1" noWrap sx={{ fontWeight: 500 }}>`
- [ ] Subtitle: `<Typography variant="body2" color="text.secondary">`
- [ ] Type label: MUI `<Chip label={workout.type} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }}>`
- [ ] Card `sx={{ width: '100%', p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, textDecoration: 'none' }}`

**Acceptance**: Card renders inside `<List>`, each card is a single `<a>` tab stop, chip shows capitalized type.

### T2.8 — Page rewrite: List rendering

**File**: `src/features/workouts/pages/WorkoutListPage.tsx`

- [ ] Replace `<ul aria-label="Workout list">` with MUI `<List aria-label="Workout list" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>`

**Acceptance**: `getByRole('list', { name: /workout list/i })` finds the list; `getAllByRole('listitem')` returns N items.

### T2.9 — Page rewrite: wrap in ThemeProvider

**File**: `src/features/workouts/pages/WorkoutListPage.tsx`

- [ ] Add `import { useMemo } from 'react'` (if not present)
- [ ] Add `import { ThemeProvider } from '@mui/material'`
- [ ] Compute `const theme = useMemo(() => createWorkoutsTheme(readShadcnDarkMode()), [])`
- [ ] Wrap the existing container (`<div className="container mx-auto ...">`) in `<ThemeProvider theme={theme}>` and replace the outer div with MUI `<Container maxWidth="sm">`

**Acceptance**: All page tests pass. `pnpm exec tsc --noEmit` clean.

---

## Phase 3: Verification Gates

### P3.1 — Lint, typecheck, tests

- [ ] `pnpm exec eslint src/features/workouts` → 0 errors
- [ ] `pnpm exec tsc --noEmit` → 0 errors
- [ ] `pnpm test src/features/workouts` → all green
- [ ] All 11 original `WorkoutListPage.test.tsx` tests still pass (now MUI-based)
- [ ] New tests for MUI-specific behavior pass

### P3.2 — Build

- [ ] `pnpm run build` → green
- [ ] Bundle size delta measured (informational only, not a blocker)

### P3.3 — E2E smoke (existing specs)

- [ ] `pnpm exec playwright test e2e/workout-with-format.spec.ts` → green
- [ ] `pnpm exec playwright test e2e/load-workout.spec.ts` → green
- [ ] No regressions in Playwright selectors (semantic queries survive MUI render)

### P3.4 — Manual smoke checklist

- [ ] Login as `athlete1@example.com` / `Password123!`
- [ ] Land on `/workouts` → list of seeded workouts renders
- [ ] Click a workout card → navigates to `/workouts/:id`
- [ ] Click "CrossFit" chip → list filters to CrossFit only
- [ ] Click "All" chip → list returns to all
- [ ] Click "Log workout" → navigates to `/workouts/new`
- [ ] Click "Export" → CSV downloads
- [ ] Click "Import" → modal opens
- [ ] Open browser devtools → no MUI warnings, no missing class errors

---

## Commit plan

Single PR. ~7 commits following strict TDD:

1. `chore(workouts): scaffold theme folder + tokens`
2. `test(workouts): add renderWithMuiTheme RED tests`
3. `feat(workouts): add renderWithMuiTheme test util (GREEN)`
4. `feat(workouts): add createWorkoutsTheme + readShadcnDarkMode`
5. `chore(vite): add MUI to optimizeDeps.include`
6. `test(workouts): update WorkoutListPage tests for MUI (RED)`
7. `feat(workouts): rewrite WorkoutListPage with MUI components (GREEN)`

Each commit ≤ 200 lines. Test commits precede implementation. One PR, single branch `feat/workouts-list-mui`.

---

## Phase 4: Post-merge hygiene

### P4.1 — Documentation

- [ ] Add `docs/features/workouts-list-mui.md` describing the migration, the dark-mode coexistence pattern, and the `theme-context-unified` follow-up

### P4.2 — SDD archive

- [ ] Run `sdd-verify` against `workouts-list-ui` spec → all scenarios pass
- [ ] Move `openspec/changes/workouts-list-mui/` to `openspec/changes/archive/<date>-workouts-list-mui/`

---

## Per-PR budget

- Forecast: ~350 lines (page ~150 + theme ~120 + tests ~80)
- 400-line cap: respected with ~50 lines of margin
- Per-commit cap: each commit ≤ 200 lines (split if any commit grows)

---

## Traceability

| Task | Files | Requirements |
| --- | --- | --- |
| T1.1 | material-tokens.ts | REQ-WL2 |
| T1.2/T1.3 | renderWithMuiTheme.{tsx,test.tsx} | REQ-WL10 |
| T1.4 | mui-workouts-theme.ts | REQ-WL1, REQ-WL2 |
| T1.5 | vite.config.ts | REQ-WL11 |
| T2.1 | WorkoutListPage.test.tsx | REQ-WL12 |
| T2.2 | WorkoutListPage.tsx | REQ-WL3 |
| T2.3 | WorkoutListPage.tsx | REQ-WL4 |
| T2.4 | WorkoutListPage.tsx | REQ-WL5 |
| T2.5 | WorkoutListPage.tsx | REQ-WL6 |
| T2.6 | WorkoutListPage.tsx | REQ-WL7 |
| T2.7 | WorkoutListPage.tsx | REQ-WL8 |
| T2.8 | WorkoutListPage.tsx | REQ-WL8 |
| T2.9 | WorkoutListPage.tsx | REQ-WL1 |
| P3.1–P3.4 | all | all |
| P4.1 | docs/features/workouts-list-mui.md | (documentation) |
| P4.2 | openspec/ | (archive) |

---

## Risks (carried from proposal)

| Risk | Mitigation |
| --- | --- |
| `readShadcnDarkMode` static (no runtime reactivity) | Document "refresh to apply dark mode" in feature doc; full reactive toggle deferred to `theme-context-unified` |
| Bundle size impact on landing | Direct import (accepted); measure post-build; split later if needed |
| Existing E2E uses semantic queries | MUI preserves `getByRole` + `getByLabelText`; confirmed in BJJ dashboard artifacts |
| MUI/shadcn class collision | Per-route MUI subtree (no global `CssBaseline`); shadcn Button siblings render fine inside MUI subtree |
| Card `component={RouterLink}` typing | One-line `as any` cast in `WorkoutCard` `sx` prop |
| Initial render `useMemo` instability | Idempotent factory; strict-mode double-invocation is harmless |

---

## Out of scope (explicit deferrals)

- `WorkoutFormPage.tsx`, `WorkoutDetailPage.tsx` — stay shadcn
- `ExportAllWorkoutsButton.tsx`, `ImportWorkoutsModal.tsx` — stay shadcn
- `useWorkouts.ts`, `workout.schema.ts` — data layer stays
- `router.tsx` — no change
- `theme-context-unified` — separate follow-up change
- `workout-detail-mui`, `workout-form-mui` — separate follow-ups if user wants
