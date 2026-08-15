---
name: bjj-dashboard
description: Delta spec for the BJJ Evolution Dashboard. New /bjj/dashboard route with 5 MUI widgets, time-window filter, English copy, Material tokens, per-widget error boundaries, code-split.
change: bjj-evolution-dashboard
status: draft
---

# Delta for BJJ Dashboard

> **Domain**: `bjj-dashboard`
> **Change**: `bjj-evolution-dashboard`
> **Spec source**: New — no existing `openspec/specs/bjj-dashboard/spec.md` to delta against. All requirements are `ADDED`.

---

## Purpose

Scannable, single-route view of a BJJ athlete's training evolution: which techniques are being practiced, how technique types are distributed, role balance, roll outcomes, and roll flow. Filterable by time window. Visual parity with Open Design `template.html`. MUI v6 scoped to this route only. System color scheme only for MVP (`theme-context-unified` is a separate follow-up).

---

## ADDED Requirements

### REQ-BD1: Dashboard Route

The system MUST expose the dashboard at route `/bjj/dashboard`. The route MUST be a child of the existing `<AppShell />` (so it inherits the standard `<Outlet />` and nav). The page component MUST be code-split via `React.lazy(() => import('.../BJJDashboardPage'))` and wrapped in a `Suspense` boundary that renders a skeleton until loaded (NFR-05).

`AppShell` MUST add a "BJJ Dashboard" entry to both surfaces: the desktop nav `<Link>` block AND the mobile `NAV_ITEMS` array.

#### Scenario: Route renders inside the existing AppShell

- GIVEN a user is authenticated and navigates to `/bjj/dashboard`
- WHEN the route resolves
- THEN the `AppShell` chrome (header, nav) MUST render around the dashboard content
- AND the dashboard content MUST render inside the existing `<Outlet />`

#### Scenario: BJJ Dashboard nav link appears in AppShell

- GIVEN the user is on any route with the AppShell visible
- WHEN the nav renders
- THEN a "BJJ Dashboard" link MUST be present in the desktop nav
- AND a "BJJ Dashboard" entry MUST be present in `NAV_ITEMS` (used by the mobile nav)

#### Scenario: Direct navigation to /bjj/dashboard works

- GIVEN an authenticated user pastes `/bjj/dashboard` into the address bar
- WHEN the router resolves the URL
- THEN the dashboard page MUST render without redirect

---

### REQ-BD2: Time Window Filter

The page header MUST contain a segmented pill control (4 presets) and a refresh button. The presets MUST be: `7 days` (`7d`), `30 days` (`30d`, default), `90 days` (`90d`), `10 rolls` (`10r`).

The active window MUST persist to `localStorage` key `bjj-dashboard-window`. On mount, the filter MUST read the saved preset; if absent, default to `30d`. On change, the filter MUST write the new preset to `localStorage` and trigger a re-fetch.

`30d` MUST compute the date range as `performed_at >= now() - 30 days`. `10r` MUST return the last 10 workouts (by `performed_at`) that have at least one confirmed roll event. All five widgets MUST receive the active window and refetch when it changes.

The page subtitle MUST update to reflect the active window (e.g. "Your game over 30 days: techniques, role balance, and how your rolls end.").

#### Scenario: Default window is 30 days on first visit

- GIVEN a user visits `/bjj/dashboard` for the first time
- AND `localStorage` has no `bjj-dashboard-window` key
- WHEN the page loads
- THEN the `30d` preset MUST be visually active
- AND all widget queries MUST be issued with the 30-day window

#### Scenario: Switching to 7 days re-fetches all widgets

- GIVEN the user is on `/bjj/dashboard` with `30d` active
- WHEN the user clicks the `7 days` preset
- THEN `localStorage.bjj-dashboard-window` MUST be set to `7d`
- AND all five widget queries MUST be re-issued with the 7-day window
- AND the page subtitle MUST reflect "over 7 days"

#### Scenario: 10r preset returns last 10 workouts with confirmed rolls

- GIVEN the user has 25 BJJ workouts in the last 90 days, of which 12 have ≥1 confirmed roll
- WHEN the user activates the `10r` preset
- THEN the query MUST be issued with the last-10-confirmed-rolls window
- AND the subtitle MUST reflect the `10r` window

#### Scenario: Refresh button refetches via invalidateQueries

- GIVEN the user is on `/bjj/dashboard` with any window active
- WHEN the user clicks the refresh button
- THEN `useBJJDashboard(window)` MUST re-execute its query (TanStack Query `invalidateQueries(['bjj-dashboard', window])`)
- AND the `generated_at` footer MUST update on the next successful response

---

### REQ-BD3: BJJDashboardData Response Shape

`useBJJDashboard(window)` MUST call `supabase.rpc('bjj_dashboard_data', { p_window })` and return a `BJJDashboardData` object matching PRD §6.11:

| Field | Type | Notes |
| --- | --- | --- |
| `title` | `string` | `"BJJ Evolution Dashboard"` |
| `subtitle` | `string` | Dynamic, reflects active window |
| `generated_at` | `string` | English display, e.g. `"Jun 12, 2026 · 2:32 PM"` |
| `last_techniques.total` | `number` | Distinct techniques practiced in window |
| `last_techniques.items[]` | `Array<{name, category, category_label, count, last_label}>` | Sorted by `last_practiced_at` desc, limit 10 |
| `technique_types.total` | `number` | Total practices in window |
| `technique_types.legend[]` | `Array<{label, color, pct}>` | Per-category |
| `technique_types.insight_rows[]` | `Array<{show_style?, text}>` | Optional insight callouts |
| `role_balance.segments[]` | `Array<{label, color, pct}>` | Attacking/defending/neutral |
| `role_balance.legend[]` | `Array<{label, color, pct}>` | Mirror of segments for the legend |
| `outcomes.tiles[]` | `Array<{label, color, pct, n}>` | Submission/position_gain/position_loss/neutral |
| `roll_flow.total_rolls` | `number` | Confirmed rolls with transitions |
| `roll_flow.total_transitions` | `number` | Sum of `transition_count` |
| `roll_flow.top_n` | `number` | Display limit (default 7) |
| `roll_flow.edges[]` | `Array<{from, to, count, pct, color}>` | `pct` is relative to max edge (100 = widest) |

#### Scenario: Hook returns the full shape from the RPC

- GIVEN the Supabase RPC `bjj_dashboard_data(p_window => '30d')` returns a valid `BJJDashboardData` payload
- WHEN the hook resolves
- THEN it MUST expose all 13 top-level fields
- AND each field's runtime type MUST match the schema above

#### Scenario: last_techniques items sorted by last_practiced_at desc

- GIVEN the user has practiced "Triangle Choke" 5 times (last on 2026-06-10) and "Armbar" 3 times (last on 2026-06-08)
- WHEN the widget data is rendered
- THEN "Triangle Choke" MUST appear before "Armbar"
- AND the list MUST be capped at 10 items

#### Scenario: roll_flow edges pct is normalized to max

- GIVEN the user has transitions A→B (10 occurrences) and C→D (3 occurrences)
- WHEN the widget data is rendered
- THEN A→B MUST have `pct = 100`
- AND C→D MUST have `pct = 30` (relative to max)

---

### REQ-BD4: Five Widgets — Layout and Grid Spans

The page MUST render exactly five widgets in a 6-column grid (desktop, >1280px) with these exact spans (PRD §6.1):

| Widget | Span desktop | Span ≤1280px | Span ≤768px |
| --- | --- | --- | --- |
| `LastTechniquesWidget` | 3 | 2 | 1 |
| `TechniqueTypeWidget` | 3 | 2 | 1 |
| `RoleBalanceWidget` | 2 | 2 | 1 |
| `OutcomesWidget` | 4 | 4 | 1 |
| `RollFlowWidget` | 6 (full width) | 4 | 1 |

The grid MUST collapse from 6 → 4 columns at ≤1280px and to 1 column at ≤768px. Row composition MUST be: Row 1 = LastTechniques | TechniqueTypes; Row 2 = RoleBalance | Outcomes; Row 3 = RollFlow (full width).

#### Scenario: Desktop grid renders with the exact spans

- GIVEN a viewport of 1440px wide
- WHEN the page renders
- THEN the 6-column grid MUST place the 5 widgets with the desktop spans above
- AND RollFlow MUST span the full width on its own row

#### Scenario: Tablet grid collapses to 4 columns

- GIVEN a viewport of 1200px wide
- WHEN the page renders
- THEN the grid MUST use 4 columns
- AND LastTechniques + TechniqueTypes MUST each span 2 columns

#### Scenario: Mobile grid collapses to 1 column

- GIVEN a viewport of 320px wide
- WHEN the page renders
- THEN every widget MUST be full-width (1 column)
- AND the layout MUST NOT horizontally overflow (NFR-04)

---

### REQ-BD5: Widget Empty States and Loading

When a widget has no data, it MUST render an empty state with the exact English copy: `Log a BJJ workout and confirm rolls in sparring sections to see your evolution.`

While a widget is loading, it MUST render a skeleton card matching its shape (matching grid span). Each widget MUST have its own error boundary — a widget-level error MUST NOT crash the page; it MUST render an inline retry control.

#### Scenario: Empty state copy on a brand-new account

- GIVEN a user with zero BJJ workouts
- WHEN `/bjj/dashboard` loads
- THEN all five widgets MUST render the empty state copy
- AND the `Live data · last updated …` footer MUST still render

#### Scenario: Per-widget error boundary catches a single failure

- GIVEN `RoleBalanceWidget` throws during render
- WHEN the page renders
- THEN the other four widgets MUST render normally
- AND the `RoleBalanceWidget` slot MUST render an inline error state with a retry control
- AND the page header and footer MUST remain functional

#### Scenario: Skeletons appear during loading

- GIVEN the dashboard is loading
- WHEN the page renders
- THEN each widget slot MUST show a skeleton card matching its grid span
- AND the header, filter bar, and footer MUST render without skeletons

---

### REQ-BD6: Drill-down Interactions

Clicking a row in `LastTechniquesWidget` MUST open the existing `TechniquePracticeModal` (Iteration 7) for that technique. Clicking a category legend row in `TechniqueTypeWidget` MUST navigate to `/bjj/blue-belt-progression?category={key}`. Clicking a tile in `OutcomesWidget` MUST navigate to a list view of roll events with that outcome (post-MVP; for MVP, link to the workouts list filtered by outcome). Clicking a row in `RollFlowWidget` MUST navigate to the source workout(s) containing that transition.

#### Scenario: Last techniques row opens TechniquePracticeModal

- GIVEN the user clicks a row in `LastTechniquesWidget`
- WHEN the click handler fires
- THEN `TechniquePracticeModal` MUST open with the technique ID and name as props
- AND the modal MUST show the workout history for that technique

#### Scenario: Technique type legend navigates to progression page

- GIVEN the user clicks a category legend row (e.g. `submission`)
- WHEN the click handler fires
- THEN the browser MUST navigate to `/bjj/blue-belt-progression?category=submission`

---

### REQ-BD7: MUI ThemeProvider Scoping

`BJJDashboardPage` MUST mount an MUI v6 `ThemeProvider` at the page boundary. The theme MUST consume tokens from `src/features/bjj/dashboard/theme/material-tokens.ts` (mirror of `template.html` lines 12–122) and `mui-dashboard-theme.ts`. The dashboard MUST import the `material-dashboard.css` port of `template.html` styles so pixel-level specs (spacing, font sizes, radii, component dimensions) match the artifact.

`ThemeProvider` MUST mount only on `/bjj/dashboard`; the rest of the app (including `AppShell`) MUST remain on shadcn/Tailwind.

#### Scenario: MUI ThemeProvider is scoped to the dashboard subtree

- GIVEN the user navigates to `/bjj/dashboard`
- WHEN the page mounts
- THEN the MUI `ThemeProvider` MUST wrap the dashboard content
- AND navigating to a different route MUST unmount the MUI `ThemeProvider`

#### Scenario: System color scheme only for MVP

- GIVEN the user's `prefers-color-scheme` is `dark`
- WHEN the dashboard renders
- THEN the MUI palette MUST use `mode: 'dark'`
- AND the dashboard MUI tokens MUST match the dark `template.html` palette
- AND there MUST be no in-app theme toggle in this change (Q2 lock — `theme-context-unified` is deferred)

#### Scenario: Visual parity with template.html

- GIVEN `template.html` and `data.json` at `open-design/5e17c655-dae0-443c-b191-c1967d177f4b/.live-artifacts/bjj-evolution-dashboard/`
- WHEN the React dashboard renders with a `BJJDashboardData` payload matching `data.json`
- THEN the rendered page MUST match the artifact's layout, sizing, and English copy

---

### REQ-BD8: AppShell Nav Entry

`AppShell` MUST add a "BJJ Dashboard" link to BOTH:
- The desktop nav `<Link>` block (visible at >768px).
- The `NAV_ITEMS` array (used by the mobile nav at ≤768px).

The link MUST point to `/bjj/dashboard`. The link MUST appear in the BJJ section of the nav (alongside existing BJJ links). No icon is required for MVP; the entry is a text link with a Material `dashboard` icon is optional.

#### Scenario: Desktop nav shows the new entry

- GIVEN a viewport wider than 768px
- WHEN the AppShell renders
- THEN the desktop nav MUST show a "BJJ Dashboard" link to `/bjj/dashboard`
- AND the link MUST be keyboard-focusable with a visible focus ring

#### Scenario: Mobile nav shows the new entry

- GIVEN a viewport of 320px wide
- WHEN the AppShell mobile menu opens
- THEN the `NAV_ITEMS` array MUST include an entry whose `to` is `/bjj/dashboard` and `label` is `BJJ Dashboard`

---

### REQ-BD9: React Bits Adoption

The dashboard MUST use at least 2 of the following React Bits components (PRD §6.13): `CountUp` (hero stats), `FadeContent` (widget mount), `AnimatedContent` (roll flow expand / empty state reveal). Components MUST be copy-pasted into `src/components/react-bits/` (no npm install per PRD §6.13).

When the user has `prefers-reduced-motion: reduce` set, motion components MUST render their static fallback (no animation, no layout shift).

#### Scenario: CountUp animates the LastTechniques hero

- GIVEN `prefers-reduced-motion` is `no-preference`
- WHEN the `LastTechniquesWidget` hero stat renders
- THEN the `CountUp` component MUST animate from 0 to the total value

#### Scenario: Reduced-motion fallback is static

- GIVEN `prefers-reduced-motion: reduce` is set on the user agent
- WHEN any motion component on the dashboard would render
- THEN the component MUST render its final value without animation
- AND no layout shift MAY occur

---

### REQ-BD10: Non-Functional Requirements

The system MUST satisfy:
- **NFR-01** Initial load p95 < 2s with 90 days of data for a typical athlete (<200 workouts).
- **NFR-04** Responsive from 320px viewport width upward.
- **NFR-05** MUI bundle code-split via `React.lazy` on `/bjj/dashboard`.
- **NFR-07** All UI copy is English; relative dates use `Intl.RelativeTimeFormat('en')`.

#### Scenario: All UI copy is English

- GIVEN any string the dashboard renders to the user (headings, subtitles, empty states, tile labels, button labels)
- WHEN the user views the page
- THEN the rendered text MUST be English
- AND no Spanish string from the Blue Belt progression page may leak into the dashboard

#### Scenario: Relative dates use Intl.RelativeTimeFormat with en locale

- GIVEN the `last_label` for a technique practiced 3 days ago
- WHEN the widget renders the row
- THEN the label MUST be the output of `Intl.RelativeTimeFormat('en').format(-3, 'day')` (e.g. `"3 days ago"`)

#### Scenario: Dashboard initial load under 2s p95

- GIVEN a typical athlete with 90 days of data (<200 workouts)
- WHEN the dashboard first loads
- THEN the time-to-interactive MUST be < 2s at p95 (measured in the verify phase)

---

## MODIFIED Requirements

None — this is a new capability.

---

## REMOVED Requirements

None.

---

## RENAMED Requirements

None.
