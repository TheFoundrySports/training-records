---
name: workouts-list-ui
description: Delta spec for the workouts list page UI — MUI rendering of /workouts while preserving shadcn/Tailwind chrome.
change: workouts-list-mui
status: draft
---

# Workouts List UI Specification

> **Domain**: `workouts-list-ui`
> **Change**: `workouts-list-mui`
> **Spec source**: New domain — no existing `openspec/specs/workouts-list-ui/spec.md` to delta against. All requirements are `ADDED`.

---

## Purpose

Define the athlete-facing `/workouts` list page rendered with MUI v6 components, coexisting with the surrounding shadcn/Tailwind chrome (`AppShell`). Preserves all existing behavior (type filter, loading/error/empty states, list rendering, navigation, import/export CTAs, query invalidation) while replacing the visual primitives.

---

## ADDED Requirements

### REQ-WL1: Per-Route MUI Theme Provider

The `/workouts` page MUST mount an MUI `ThemeProvider` at its component boundary. The provider MUST NOT wrap the `AppShell` or any other route — only this one page subtree.

The theme MUST be constructed via `createWorkoutsTheme(mode)` from `src/features/workouts/theme/mui-workouts-theme.ts`. The mode MUST be derived from `readShadcnDarkMode()` (reads the shadcn `<html class="dark">` class) so MUI and shadcn stay in dark-mode sync without introducing a new theme toggle.

The theme object MUST be memoized (`useMemo` with empty deps) so MUI does not recompute on every render.

#### Scenario: /workouts renders inside MUI ThemeProvider

- GIVEN the user is on `/workouts`
- WHEN the page mounts
- THEN an MUI `<ThemeProvider>` MUST wrap the page content
- AND the theme MUST be `createWorkoutsTheme(readShadcnDarkMode())`

#### Scenario: Other routes do not mount MUI ThemeProvider

- GIVEN the user navigates from `/workouts` to `/workouts/:id` or any other route
- WHEN the route renders
- THEN NO MUI `<ThemeProvider>` MUST be present in the React tree
- AND the surrounding `AppShell` MUST continue rendering shadcn/Tailwind components

#### Scenario: Dark class on html drives MUI mode

- GIVEN `<html class="dark">` is present in the DOM
- WHEN the workouts list page mounts
- THEN `readShadcnDarkMode()` MUST return `'dark'`
- AND `createWorkoutsTheme('dark')` MUST be called
- AND MUI components MUST render with the dark palette

- GIVEN `<html class="">` (no `dark` class)
- WHEN the workouts list page mounts
- THEN `readShadcnDarkMode()` MUST return `'light'`
- AND `createWorkoutsTheme('light')` MUST be called
- AND MUI components MUST render with the light palette

---

### REQ-WL2: Theme Tokens Trace to shadcn CSS Variables

`src/features/workouts/theme/material-tokens.ts` MUST define a typed `MuiPalette` for both light and dark modes. Every color MUST trace to a shadcn CSS variable in `src/index.css` (lines 8–132).

The font family MUST use `"Geist Variable"` (the project's standard font from `@fontsource-variable/geist`), not Roboto. Typography sizes MUST match the existing shadcn scale (`text-2xl` → `1.5rem/600`, `text-sm` → `0.875rem/1.5`, `text-xs muted` → `0.75rem`).

#### Scenario: All MUI palette colors trace to shadcn CSS vars

- GIVEN the light palette in `material-tokens.ts`
- WHEN reviewing the file
- THEN each hex/rgb value MUST have a comment naming the shadcn CSS variable it derives from
- AND no new colors are introduced

#### Scenario: Typography uses Geist font

- GIVEN `createWorkoutsTheme('light')` returns a theme
- WHEN inspecting `theme.typography.fontFamily`
- THEN it MUST equal `"Geist Variable", -apple-system, BlinkMacSystemFont, sans-serif`

#### Scenario: No Roboto import

- GIVEN the workouts feature source files
- WHEN grepping for `roboto`
- THEN no matches MUST be found (Roboto is not the project standard)

---

### REQ-WL3: Page Header

The page header MUST render the title "Workouts" as an MUI `<Typography variant="h4">` (semantically `<h1>`), and a row of action buttons aligned to the right.

Actions in the row, in order: `ExportAllWorkoutsButton` (shadcn, unchanged), `Import` (MUI `Button` `variant="outlined"`), `Log workout` (MUI `Button` `variant="contained"`). The `Log workout` button navigates to `/workouts/new`; the `Import` button opens the `ImportWorkoutsModal`.

#### Scenario: Page header renders title and three actions

- GIVEN the user is on `/workouts`
- WHEN the page renders
- THEN an `<h1>` element with text "Workouts" MUST be present
- AND three buttons MUST be visible in the right-hand action row: Export, Import, Log workout

#### Scenario: Log workout navigates to /workouts/new

- GIVEN the user clicks the "Log workout" button
- WHEN the navigation fires
- THEN the browser URL MUST change to `/workouts/new`

#### Scenario: Import opens the modal

- GIVEN the user clicks the "Import" button
- WHEN the click fires
- THEN `ImportWorkoutsModal.open` MUST become `true`
- AND the modal MUST render

#### Scenario: Export downloads CSV

- GIVEN the user clicks the "Export" button
- WHEN the click fires
- THEN `ExportAllWorkoutsButton` MUST handle the click (existing shadcn behavior; no regression)

---

### REQ-WL4: Type Filter

A type filter MUST render as an MUI `<ToggleButtonGroup>` with four `<ToggleButton>`s in order: All, CrossFit, Functional, BJJ. The active toggle MUST be visually distinct from inactive ones (MUI default behavior).

The filter state MUST be local to the page (`useState`). When the user clicks the active chip again, the filter MUST stay sticky (not toggle off).

#### Scenario: Default filter is All

- GIVEN the user visits `/workouts` for the first time
- WHEN the page renders
- THEN the "All" toggle MUST be visually active
- AND `useWorkouts({ type: 'all' })` MUST be called

#### Scenario: Clicking CrossFit filters the list

- GIVEN the user clicks the "CrossFit" toggle
- WHEN the click fires
- THEN `setFilter('crossfit')` MUST be called
- AND `useWorkouts({ type: 'crossfit' })` MUST be called with the new type

#### Scenario: All four filter options exist

- GIVEN the filter component renders
- WHEN the user inspects the UI
- THEN exactly 4 toggle buttons MUST be present with labels: All, CrossFit, Functional, BJJ

#### Scenario: Clicking active chip does not deselect

- GIVEN the "CrossFit" toggle is active
- WHEN the user clicks it again
- THEN the filter MUST remain `'crossfit'`
- AND the list MUST NOT switch to all-workouts

#### Scenario: Filter has accessible label

- GIVEN the filter component renders
- WHEN the user inspects the DOM
- THEN the toggle group MUST have `aria-label="Filter workouts by type"`

---

### REQ-WL5: Loading Skeleton

While `useWorkouts` is fetching, the page MUST render 3 MUI `<Skeleton variant="rectangular">` placeholders, each 80px tall, stacked vertically with 12px (1.5 * 8px) gap.

#### Scenario: Skeleton appears during loading

- GIVEN `useWorkouts` is in `isLoading: true` state
- WHEN the page renders
- THEN 3 `<Skeleton variant="rectangular">` elements MUST be present
- AND the container MUST have `role="status"` and `aria-label="Loading workouts"`

#### Scenario: Skeleton is hidden when data loads

- GIVEN `useWorkouts` returns data with `isLoading: false`
- WHEN the page renders
- THEN no skeleton elements MUST be present

---

### REQ-WL6: Error State

When `useWorkouts` returns an error, the page MUST render an MUI `<Alert severity="error">` with title "Failed to load workouts" and a body containing either the parsed `error.message` or a fallback string.

#### Scenario: Error renders MUI Alert

- GIVEN `useWorkouts` returns `isError: true` with `error.error.message = "Network down"`
- WHEN the page renders
- THEN an MUI `<Alert severity="error">` MUST be present
- AND the body MUST contain the text "Network down"

#### Scenario: Error fallback when message is absent

- GIVEN `useWorkouts` returns `isError: true` with no message
- WHEN the page renders
- THEN the alert body MUST contain "An unexpected error occurred. Please try again."

#### Scenario: Alert has role=alert

- GIVEN the error state renders
- WHEN the user inspects the DOM
- THEN the alert MUST have `role="alert"` (MUI default) or equivalent `aria-live="assertive"` semantics

---

### REQ-WL7: Empty State

When `useWorkouts` returns `data.length === 0` and is not loading and no error, the page MUST render an MUI `<Stack>` with centered text "No workouts yet" and a subtitle "Log your first workout to get started.", plus an MUI `<Button variant="contained">` labeled "Log workout" that navigates to `/workouts/new`.

#### Scenario: Empty state CTA navigates to new workout

- GIVEN the user has 0 workouts
- WHEN the page renders
- THEN the "No workouts yet" text MUST be present
- AND a "Log workout" button MUST be present
- AND clicking the button MUST navigate to `/workouts/new`

---

### REQ-WL8: Workout Card List Rendering

When `useWorkouts` returns data with at least one workout, the page MUST render the list inside an MUI `<List aria-label="Workout list">` with one `<ListItem>` per workout.

Each card MUST be a single MUI `<Card component={RouterLink}>` with:

- Title (workout.title) as `<Typography variant="body1" noWrap>` with `fontWeight: 500`
- Subtitle (formatted `performedAt` + `durationMinutes` + " min") as `<Typography variant="body2" color="text.secondary">`
- Type label as MUI `<Chip label={workout.type} size="small" variant="outlined">` with `textTransform: "capitalize"`

Clicking a card MUST navigate to `/workouts/:id`.

#### Scenario: List renders one ListItem per workout

- GIVEN `useWorkouts` returns 3 workouts
- WHEN the page renders
- THEN a `<ul>` (MUI `<List>`) with `aria-label="Workout list"` MUST contain exactly 3 `<li>` (MUI `<ListItem>`) children

#### Scenario: Card click navigates to detail

- GIVEN a workout with id `abc-123` is in the list
- WHEN the user clicks the card
- THEN the browser URL MUST change to `/workouts/abc-123`

#### Scenario: Card renders type as Chip

- GIVEN a workout with type `'crossfit'`
- WHEN the card renders
- THEN a `<Chip label="crossfit" />` with visible text "Crossfit" (capitalized via `textTransform`) MUST be present

#### Scenario: Card title truncates on overflow

- GIVEN a workout with a 100-character title
- WHEN the card renders in a 320px viewport
- THEN the title MUST be visually truncated with ellipsis (MUI `noWrap` + overflow handling)

#### Scenario: Card is keyboard-focusable

- GIVEN the user tabs through the page
- WHEN the card receives focus
- THEN it MUST be a single tab stop (one `<a>` element, not nested)
- AND a visible focus ring MUST appear

---

### REQ-WL9: ExportAllWorkoutsButton stays shadcn

The `ExportAllWorkoutsButton` MUST remain a shadcn `Button` (out of scope). It MUST be rendered inside the MUI subtree of the page alongside MUI Buttons without DOM or CSS conflict.

#### Scenario: shadcn Export button coexists with MUI siblings

- GIVEN the action row renders
- WHEN the DOM is inspected
- THEN the Export button MUST have its original shadcn `Button` classes
- AND the Import and Log workout buttons MUST have MUI `MuiButton-root` classes
- AND no console errors about class collisions MUST appear

---

### REQ-WL10: Test Wrapper

A test util `renderWithMuiTheme` MUST exist at `src/features/workouts/theme/renderWithMuiTheme.tsx`. It MUST wrap children in `<ThemeProvider>` + `<CssBaseline>` + the provided mode's theme. It MUST accept an optional `mode` argument defaulting to `'light'`.

The util MUST be used as the wrapper for all `WorkoutListPage` tests.

#### Scenario: renderWithMuiTheme wraps in ThemeProvider

- GIVEN a test that calls `renderWithMuiTheme(<div data-testid="x" />)`
- WHEN the test asserts `screen.getByTestId('x')` is in the document
- THEN the assertion MUST pass

#### Scenario: renderWithMuiTheme accepts mode option

- GIVEN a test that calls `renderWithMuiTheme(<Child />, { mode: 'dark' })`
- WHEN `Child` reads MUI theme via `useTheme()`
- THEN `theme.palette.mode` MUST equal `'dark'`

---

### REQ-WL11: Vite Optimize Deps

`vite.config.ts` MUST add `@mui/material`, `@mui/material/styles`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled` to `optimizeDeps.include` to prevent dev-server "optimized chunk didn't load" errors on Vite 8 / Rolldown.

#### Scenario: Dev server boots without MUI optimization warnings

- GIVEN a fresh `pnpm install` after merge
- WHEN running `pnpm dev`
- THEN no "failed to optimize dep" warnings about MUI MUST appear in the dev server output

---

### REQ-WL12: Strict TDD Compliance

Every file shipped by this change MUST follow the project's strict TDD rule (per `openspec/config.yaml:11`):

- Each new module ships a `__tests__/` sibling with a failing test committed BEFORE the implementation
- Each modification to an existing test file updates tests FIRST (RED), then the implementation (GREEN)
- Refactor commits are allowed AFTER the GREEN

#### Scenario: New theme files ship with tests

- GIVEN `theme/material-tokens.ts` is committed
- WHEN reviewing git log
- THEN a `__tests__/` sibling MUST exist with at least one assertion

- GIVEN `theme/mui-workouts-theme.ts` is committed
- WHEN reviewing git log
- THEN a test asserting `createWorkoutsTheme('light')` returns a valid MUI theme MUST exist

- GIVEN `theme/renderWithMuiTheme.tsx` is committed
- WHEN reviewing git log
- THEN a smoke test asserting child renders inside ThemeProvider MUST exist

#### Scenario: WorkoutListPage rewrite follows RED→GREEN

- GIVEN the WorkoutListPage rewrite
- WHEN reviewing git log
- THEN test changes MUST appear BEFORE implementation changes in the same logical step

---

## MODIFIED Requirements

None — this is a new capability.

---

## REMOVED Requirements

None.

---

## RENAMED Requirements

None.

---

## Traceability

| Requirement | Phase | Primary files |
| --- | --- | --- |
| REQ-WL1 | Theme | `WorkoutListPage.tsx`, `theme/mui-workouts-theme.ts` |
| REQ-WL2 | Theme | `theme/material-tokens.ts` |
| REQ-WL3 | Page | `WorkoutListPage.tsx` |
| REQ-WL4 | Page | `WorkoutListPage.tsx` |
| REQ-WL5 | Page | `WorkoutListPage.tsx` |
| REQ-WL6 | Page | `WorkoutListPage.tsx` |
| REQ-WL7 | Page | `WorkoutListPage.tsx` |
| REQ-WL8 | Page | `WorkoutListPage.tsx` |
| REQ-WL9 | Page | `WorkoutListPage.tsx` + `ExportAllWorkoutsButton.tsx` (unchanged) |
| REQ-WL10 | Tests | `theme/renderWithMuiTheme.tsx`, `WorkoutListPage.test.tsx` |
| REQ-WL11 | Tooling | `vite.config.ts` |
| REQ-WL12 | Process | All commits |
