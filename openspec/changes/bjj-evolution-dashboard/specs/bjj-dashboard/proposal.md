# Capability Proposal: bjj-dashboard

> **Status**: Added (new domain — no existing `openspec/specs/bjj-dashboard/spec.md` to delta against)
> **Change**: `bjj-evolution-dashboard`
> **Parent proposal**: `openspec/changes/bjj-evolution-dashboard/proposal.md`

## Why Added (not Modified)

The BJJ Evolution Dashboard is a **brand new surface** in the application. No route, no MUI integration, no Material token layer, no React Bits adoption, and no `BJJDashboardData` response shape exist in the codebase today. Therefore the capability is `Added` — there is nothing to delta against. The change introduces:

- A new route `/bjj/dashboard` (sibling to `/bjj/new`, `/bjj/:id/edit`, `/bjj/blue-belt-progression`).
- A new top-level feature folder `src/features/bjj/dashboard/` (PRD §8.1).
- A new MUI v6 dependency surface scoped to the route only (NG1).
- A new `useBJJDashboard(window)` hook and a new `bjj_dashboard_data` RPC.
- A new "BJJ Dashboard" entry in `AppShell` `NAV_ITEMS` and desktop nav.

The only **modified** adjacent surfaces (`BJJSectionEditor`, `ProgressionSection` category labels, `AppShell` nav) are captured as dependencies of `bjj-roll-events` and `bjj-position-vocabulary` specs, not as their own modified capabilities.

## What this capability owns

- The 5-widget dashboard page (LastTechniques, TechniqueTypes, RoleBalance, Outcomes, RollFlow).
- The 6-column grid layout with responsive collapse (≤1280px → 4 cols, ≤768px → 1 col) and the per-widget grid spans from PRD §6.1.
- The time-window filter (`7d` / `30d` default / `90d` / `10r`) with `localStorage` persistence.
- The refresh button, empty states, loading skeletons, per-widget error boundaries.
- The MUI `ThemeProvider` mount at the page boundary (system color scheme only for MVP — `theme-context-unified` is deferred).
- The Material token layer (`material-tokens.ts`, `material-dashboard.css`, `mui-dashboard-theme.ts`) ported from `template.html`.
- ≥2 React Bits components used with `prefers-reduced-motion` fallback.
- AppShell nav integration ("BJJ Dashboard" link).
- Visual parity acceptance: layout/sizing/English copy matches `template.html` (reference only — do not reproduce).
- NFR-01 (p95 < 2s for 90 days), NFR-04 (320px responsive), NFR-05 (`React.lazy` code-split), NFR-07 (English copy + `Intl.RelativeTimeFormat('en')`).
