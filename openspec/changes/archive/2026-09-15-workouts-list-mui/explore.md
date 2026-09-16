# Exploration: Workouts List — MUI Refactor

> **Change**: `workouts-list-mui`
> **Scope**: only `/workouts` list (per user)
> **Branch**: `feat/workouts-list-mui` from `main`
> **Pure investigation**: no code changes, no proposal yet.

---

## 1. Reuse surface — what already exists

### 1.1 `WorkoutListPage.tsx` — current implementation

- **Path**: `src/features/workouts/pages/WorkoutListPage.tsx` (~140 lines)
- **UI library**: shadcn/ui + Tailwind v4 (`Card`, `CardContent`, `Badge`, `Button`); raw HTML `<ul>/<li>` with `aria-label="Workout list"`
- **Internal subcomponents** (all file-local):
  - `WorkoutCard` — wraps `Card` in a `Link` with `hover:ring-primary/40` styling; shows title, formatted date, duration, type badge
  - `LoadingSkeleton` — three pulsing `bg-muted` rectangles with `animate-pulse`
  - `TypeFilter` — segmented pill group with 4 options (All, CrossFit, Functional, BJJ), `aria-pressed` state
- **Hooks used**: `useWorkouts({ type: filter })` (TanStack Query), `useQueryClient` for invalidation, `useNavigate` for routing
- **State**: `filter: FilterType` (`'all' | 'crossfit' | 'functional' | 'bjj'`), `importModalOpen: boolean`
- **Actions**: Log workout (→ `/workouts/new`), Import (opens `ImportWorkoutsModal`), Export (`ExportAllWorkoutsButton`)
- **Empty state copy**: "No workouts yet" + CTA
- **Error state**: red destructive border, raw error message fallback

### 1.2 Route

- **Path**: `src/app/router.tsx` lines 47–52
- Wires `path: 'workouts'` → `<WorkoutListPage />` inside the `ProtectedRoute > AppShell` children block
- Inherits auth + nav chrome — no route change needed

### 1.3 MUI infrastructure

- **Installed** (verified via `package.json` + `node_modules/@mui/material`):
  - `@mui/material` (Grid, Card, Stack, Typography, ToggleButtonGroup, Alert, Skeleton, Chip, IconButton, etc.)
  - `@mui/icons-material` (for workout-type icons: FitnessCenter, Whatshot, SportsMartialArts, List)
  - `@emotion/react` + `@emotion/styled` (peer deps for Material v6)
  - `@fontsource-variable/roboto` + `@fontsource-variable/roboto-mono`
- **Not imported** anywhere in `src/` (`grep -r "@mui" src/` returns 0 matches)
- No MUI `ThemeProvider` mounted anywhere
- No MUI theme file in `src/theme/` or `src/features/`
- **Conclusion**: MUI is a greenfield integration for this project. No existing MUI infrastructure to extend.

### 1.4 shadcn theme system (current)

- `src/index.css` lines 8–132: `:root` + `.dark` selectors with CSS custom properties (HSL colors, radii, spacing tokens)
- `@custom-variant dark (&:is(.dark *))` (line 6) — Tailwind v4 dark mode gated by `<html class="dark">`
- `useTheme` from shadcn not used; theme toggle is implicit via `color-scheme` CSS
- The `WorkoutListPage` consumes these tokens via Tailwind utilities (`bg-muted`, `text-muted-foreground`, `border-input`, etc.)

### 1.5 Related workouts files (out of scope, but noted)

- `src/features/workouts/components/ExportAllWorkoutsButton.tsx` — shadcn `Button`-based
- `src/features/workouts/components/ImportWorkoutsModal.tsx` — shadcn-based modal (not in scope per user)
- `src/features/workouts/hooks/useWorkouts.ts` — data hook (no UI, stays)
- `src/features/workouts/pages/WorkoutFormPage.tsx`, `WorkoutDetailPage.tsx` — shadcn-based (NOT in scope per user)
- `src/features/workouts/components/WorkoutTypePicker.tsx` — Material-scope variant (already uses some Material tokens from the `bjj-evolution-dashboard` work, but is NOT imported by the workouts list page)

### 1.6 Calendar + BJJ precedents

- `src/features/calendar/components/CalendarGrid.tsx` — pure shadcn/Tailwind; not a reference for MUI patterns
- `src/features/bjj/dashboard/components/*` — supposedly uses MUI per the BJJ dashboard change, but those files do not currently exist in the working tree (`feat/workouts-list-mui` from main). The BJJ dashboard route shows MUI patterns in archived artifacts but is not in this branch's working set.
- **Conclusion**: there is no in-repo MUI pattern to copy from — this refactor establishes the project's MUI conventions.

### 1.7 Testing pattern

- `src/features/workouts/pages/WorkoutListPage.test.tsx` — 11 tests covering: empty list, filter chips, error state, loading skeleton, list rendering, click navigation, import/export buttons
- Tests render the page inside a `<MemoryRouter>` wrapper with `QueryClientProvider`
- Uses `@testing-library/react` + `userEvent`
- Vitest strict TDD: `vitest.config.ts` enables strict TDD mode

---

## 2. Greenfield surface — what must be created

### 2.1 Theme infrastructure

- **`src/features/workouts/theme/mui-workouts-theme.ts`** — `createTheme({ palette: { mode }, typography, components })` factory mirroring the existing shadcn CSS tokens
- **`src/features/workouts/theme/material-tokens.ts`** — typed export of light/dark palette, spacing scale, typography (font family from `package.json` fonts, not Roboto)
- **`src/features/workouts/theme/renderWithMuiTheme.tsx`** — test util wrapping children in `ThemeProvider` (follow the BJJ dashboard pattern, **but absent from current branch** — build from scratch using `@testing-library/react` + `MUI ThemeProvider`)
- **No global mount**: theme provider lives at the page boundary (consistent with the BJJ dashboard's per-route scoping decision)

### 2.2 Page rewrite

- **`src/features/workouts/pages/WorkoutListPage.tsx`** — replace all shadcn components with MUI equivalents; preserve behavior (filter, loading, error, empty, list rendering, import/export/CTA buttons, query invalidation)

### 2.3 Tests

- `WorkoutListPage.test.tsx` — same coverage, but using `renderWithMuiTheme` wrapper
- New `renderWithMuiTheme.test.tsx` — smoke test for the test util

### 2.4 Vite config

- **`vite.config.ts`** — add `@mui/material`, `@emotion/react`, `@emotion/styled` to `optimizeDeps.include` (mirrors the BJJ dashboard pattern, ensures dev server pre-bundles correctly)

### 2.5 What does NOT need to change

- `WorkoutFormPage.tsx`, `WorkoutDetailPage.tsx` (shadcn stays — out of scope per user)
- `ExportAllWorkoutsButton.tsx`, `ImportWorkoutsModal.tsx` (shadcn stays — only used by this page, but user scoped to "list")
- `useWorkouts.ts`, `workout.schema.ts`, `workout.types.ts` (data layer)
- `router.tsx` route definition (no path/component change)

---

## 3. Reuse vs. replace — component-by-component map

| Current (shadcn/Tailwind) | MUI replacement | Notes |
| --- | --- | --- |
| `Card` + `CardContent` (in `WorkoutCard`) | `Card` + `CardContent` (MUI) | Same name, MUI flavor. Keep `<Link>` wrapper for navigation. |
| `Badge` (type label) | `Chip` (MUI) `size="small"` with `variant="outlined"` | Cleaner Material look; remove `capitalize` since data is already lowercase |
| `<ul aria-label="Workout list">` + `<li>` | MUI `List` + `ListItem` | Built-in semantic list semantics; MUI handles `aria-label` via `aria-labelledby` or `aria-label` props |
| `Button` (Log workout, Import) | MUI `Button` `variant="contained"` + `variant="outlined"` | Matches the current variants |
| TypeFilter `<button>` chips | MUI `ToggleButtonGroup` + `ToggleButton` | Idiomatic MUI segmented control; supports `aria-pressed` automatically via `selected` prop |
| `LoadingSkeleton` (3 pulsing rects) | MUI `<Skeleton variant="rectangular">` × 3 | MUI built-in shimmer; no `animate-pulse` needed |
| Error state raw divs | MUI `<Alert severity="error">` | Built-in a11y (`role="alert"`) |
| Empty state raw divs + Button | MUI `<Stack>` + `<Typography>` + Button | Idiomatic empty state |
| `<h1 className="text-2xl font-semibold">` | MUI `<Typography variant="h4">` | Material type scale |
| `<div className="container mx-auto ...">` | MUI `<Container maxWidth="sm">` | MUI's responsive container |

---

## 4. Design considerations

### 4.1 Typography

- Current uses shadcn default (`text-2xl font-semibold`) which inherits from `body` font (system stack)
- Project fonts in `package.json`: `@fontsource-variable/geist` (and Geist Mono) — open-design project fonts
- **Decision needed**: use Geist (project standard) for Material typography, or fall back to Roboto (Material default)?
  - Geist keeps the workouts list consistent with the rest of the app
  - Roboto is more "Material" but breaks visual consistency

### 4.2 Color scheme

- Current shadcn: `:root` (light) + `.dark` (dark) via `<html class="dark">`
- MUI: `palette.mode = 'light' | 'dark'`
- **Two coexistence options**:
  - A. **MUI follows shadcn**: MUI `createTheme({ palette: { mode: readFromShadcnClass() } })` — read `document.documentElement.classList.contains('dark')` and pass to MUI
  - B. **MUI standalone**: MUI uses `prefers-color-scheme` only on this route (deferred theme toggle)
  - C. **Unified context**: introduce `src/theme/ThemeContext.tsx` (light/dark/system + localStorage) — **already shipped in `bjj-evolution-dashboard` per archived docs, but not present in working tree**
- Recommendation: option A (minimal, no new infrastructure; MUI reads shadcn's `.dark` class)

### 4.3 Theme scope

- Per-route MUI `ThemeProvider` mounted at `WorkoutListPage` boundary (mirrors BJJ dashboard's `BJJDashboardPage` boundary pattern — **but absent from current branch**)
- `WorkoutFormPage`, `WorkoutDetailPage` stay on shadcn/Tailwind (out of scope per user)

### 4.4 Bundle size

- `WorkoutListPage` is not lazy-loaded today (it's the landing page)
- Adding MUI bundle (~50KB gzipped) to the initial bundle would impact the landing experience
- **Options**:
  - Keep direct import (simpler, faster initial render — but bigger bundle)
  - `React.lazy` to split (smaller initial bundle — but adds skeleton)
  - User preference needed

---

## 5. Open questions for the user

1. **Typography**: use Geist (project standard) or fall back to Roboto (Material default)?
2. **Dark mode coexistence**: MUI reads shadcn's `.dark` class (option A) or standalone `prefers-color-scheme` (option B) or unified ThemeContext (option C — would touch more files)?
3. **Bundle strategy**: keep `WorkoutListPage` as direct import (bigger initial bundle) or `React.lazy` to split the MUI chunk (skeleton on first load)?
4. **WorkoutTypePicker note**: it already uses some Material tokens from the BJJ dashboard work but is NOT used by the workouts list. Out of scope here, but worth flagging for a future `workouts-mui-refactor` change.

---

## Result contract

- **status**: `ok` — all sections investigated. No blockers.
- **artifacts**: `openspec/changes/workouts-list-mui/explore.md` (this file)
- **key_reuse_points**: data hooks (`useWorkouts`), route definition (`router.tsx`), shadcn dark-mode class hook, MUI dependencies already installed
- **key_greenfield**: MUI theme infrastructure (factory + tokens + test util + vite optimizeDeps), full `WorkoutListPage.tsx` rewrite
- **risks**: bundle size impact on landing, MUI/shadcn class collisions (mitigated by per-route scope), Material type scale deviating from shadcn defaults
- **open_questions_for_user**: 4 (typography, dark mode, bundle strategy, scope of WorkoutTypePicker)
- **next_recommended**: `sdd-propose`
