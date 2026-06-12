# Proposal: BJJ Evolution Dashboard

> Iteration 8 · Source PRD: `docs/prd-bjj-dashboard.md` v0.3
> Open Design artifact: `open-design/5e17c655-dae0-443c-b191-c1967d177f4b/.live-artifacts/bjj-evolution-dashboard/`

## Intent

BJJ athletes in Training Records already log workouts with AI-enhanced sections and linked techniques (Iterations 4–7), and they track blue-belt checklist progress, but they cannot answer higher-level questions about how their game is evolving. The BJJ Evolution Dashboard gives them a single, scannable view: which techniques they are practicing, how technique types are distributed, whether they spend more time attacking or defending, how rolls end, and which position transitions dominate — filterable by time window, drilled into source workouts, and matching the Open Design artifact pixel-for-pixel. Success means: an athlete opens `/bjj/dashboard`, understands their last 30 days at a glance, drills into a workout to confirm context, and trusts the roll metrics because the AI proposed the rolls and the athlete confirmed them.

## Scope

### In Scope

- **New `/bjj/dashboard` MUI route** (G1–G7, G11, NFR-01..07) with 5 widgets, time-window filter, English copy, visual parity with the Open Design `template.html`.
- **New `bjj_roll_events` table** + 4 enums (`bjj_roll_role`, `bjj_roll_outcome`, `bjj_roll_event_status`, `bjj_roll_event_source`) + 3 indexes + unique `(section_id, roll_index)` + RLS mirroring `bjj_section_techniques` (G3–G5).
- **3 SQL views** `bjj_dashboard_role_balance`, `bjj_dashboard_outcomes`, `bjj_dashboard_position_transitions` (PRD §6.9) — pre-computed aggregation source.
- **1 SQL RPC** `bjj_dashboard_data(p_window text, p_start date, p_end date)` returning the full `BJJDashboardData` (PRD §6.11) — composes the 3 views + technique aggregates.
- **New `bjj_positions` lookup table** with canonical keys + EN/ES display labels (Q2 decision).
- **New `RollReviewPanel`** integrated in `BJJSectionEditor` — confirm / edit / add / delete / skip for proposed rolls (G7, US-48, US-49).
- **Extended `bjj-section-ai` Edge Function** response with `rolls[]` (PRD §6.8.2); mock fallback updated to emit `rolls: []`.
- **New `src/features/bjj/dashboard/`** feature folder (PRD §8.1).
- **New `src/features/bjj/category-labels.ts`** — `Record<'en' | 'es', Record<BJJCategory, string>>` + `categoryLabel()` helper (Q3 decision).
- **New `src/features/bjj/dashboard/theme/`** — `material-tokens.ts`, `material-dashboard.css` (port of `template.html`), `mui-dashboard-theme.ts` (MUI v6 theme from tokens).
- **3 React Bits components** under `src/components/react-bits/`: `CountUp`, `FadeContent`, `AnimatedContent` — copy-paste via shadcn/jsrepo (PRD §6.13).
- **New MUI dependencies**: `@mui/material`, `@emotion/react`, `@emotion/styled`, `@mui/x-charts` (optional), `@fontsource-variable/roboto`, `@fontsource-variable/roboto-mono`.
- **AppShell nav entry** "BJJ Dashboard" added to desktop nav + `NAV_ITEMS` mobile array.
- **New `useBJJDashboard(window)`** hook — calls `supabase.rpc('bjj_dashboard_data', { p_window })` (justification: pure SQL aggregation, not AI; `.rpc()` is the native Supabase client call and gets typed responses).
- **New `useConfirmRolls()`** mutation — batches `bjj_roll_events` upsert.
- **Historical backfill migration** — idempotent `INSERT ... ON CONFLICT DO NOTHING` proposing rolls for sparring sections (Q4 decision).
- **Banner on dashboard** for sparring sessions without confirmed roll data (US-49).
- **Code-split** `/bjj/dashboard` via `React.lazy` + `Suspense` skeleton (NFR-05).
- **Test strategy**: strict TDD — Vitest (vitest strict_tdd: true) for utils, hooks, components, RLS round-trip; Deno for EF contract; Playwright E2E for full flow.

### Out of Scope (this change)

- **Unified `ThemeContext` + `AppShell` theme toggle IconButton** — MUI ships with `prefers-color-scheme` follow only on the dashboard route. Deferred to follow-up change `theme-context-unified`.
- Full-app migration from shadcn/Tailwind to MUI (PRD NG1).
- Coach multi-athlete dashboard (PRD NG3 / 8.1).
- Purple / brown / black belt dashboards (PRD NG4).
- Custom date picker for "Custom" time preset (PRD §6.2 — post-MVP).
- Period comparison (8.2), CSV export (8.3), full structured per-roll logging (8.4), sparklines (8.5).

## Capabilities

### New Capabilities

- `bjj-dashboard`: Five-widget MUI dashboard at `/bjj/dashboard` consuming a single `bjj_dashboard_data` RPC; time filter; English copy; Open Design visual parity; MUI v6 + Material tokens; per-widget error boundaries; code-split.
- `bjj-roll-events`: Hybrid roll capture — AI propose via `bjj-section-ai` `rolls[]`, athlete review via `RollReviewPanel`, persist as `status = 'confirmed'`. Includes table, enums, views, RPC, RLS, historical backfill banner.
- `bjj-position-vocabulary`: `bjj_positions` lookup table + shared EN/ES display map; enforced at form/AI prompt level for input, with a server-side guard in `bjj_dashboard_data` RPC for safety.

### Modified Capabilities

- None — there is no existing main spec to delta against. The `bjj-section-ai` EF extension and `BJJSectionEditor` integration are captured inside the new `bjj-roll-events` and `bjj-dashboard` specs respectively.

## Approach

### Architecture sketch (4 moving parts)

```mermaid
flowchart LR
  subgraph capture[Capture]
    RE[raw_description]
    EF[bjj-section-ai<br/>+rolls[]]
    RRP[RollReviewPanel]
  end
  subgraph db[Supabase]
    RE_T[bjj_roll_events]
    TECH[bjj_section_techniques]
    LOG[technique_practice_log]
    POS[bjj_positions]
    V[3 dashboard views]
    RPC[bjj_dashboard_data]
  end
  subgraph ui[Dashboard]
    PG[BJJDashboardPage]
    W1[LastTechniques]
    W2[TechniqueTypes]
    W3[RoleBalance]
    W4[Outcomes]
    W5[RollFlow]
  end
  RE --> EF --> RRP --> RE_T
  RE_T --> V --> RPC
  TECH --> LOG --> W1
  TECH --> W2
  RPC --> W3 & W4 & W5
  PG --> W1 & W2 & W3 & W4 & W5
```

### State management

- **TanStack Query keys**: `['bjj-dashboard', window]` (root), per-widget `['bjj-dashboard', window, 'last-techniques' | 'technique-types' | 'role-balance' | 'outcomes' | 'roll-flow']` if split for per-widget error boundaries (NFR-03).
- **Invalidation**: `useConfirmRolls().onSuccess` → `invalidateQueries({ queryKey: ['bjj-dashboard'] })` so the 3 roll-derived widgets re-fetch.
- **localStorage** key `bjj-dashboard-window` persists the active preset; `DashboardTimeFilter` reads on mount, writes on change.
- **No new global state** — the deferred `ThemeContext` is not part of this change; dashboard reads `prefers-color-scheme` via `window.matchMedia`.

### Roll capture flow (4-step lifecycle)

1. `proposed` — `bjj-section-ai` returns `rolls[]` when the section indicates sparring (keyword heuristic + AI classification).
2. `RollReviewPanel` renders inline below `AIPreviewPanel`; user confirms / edits / adds / deletes / skips.
3. `confirmed` — `useConfirmRolls` upserts rows with `status = 'confirmed'`, `source = 'ai_confirmed' | 'ai_edited' | 'manual'`.
4. `rejected` (implicit) — skipped rows are simply not persisted; re-enhance replaces `status = 'proposed'` rows only, never confirmed ones.

### Theme strategy (MVP shim)

- MUI v6 `ThemeProvider` mounted at `BJJDashboardPage` boundary; `mode` derived from `prefers-color-scheme` (default), overridable per-tab via `setMode` while dev-previewing.
- `material-dashboard.css` is the **port of `template.html`** styles into the dashboard feature (PRD §6.10.1 explicitly suggests this path over emotion-at-runtime) — avoids Tailwind/MUI class collision inside the route.
- `material-tokens.ts` is the typed source of truth for both CSS variables and `createTheme({ palette })`.
- **No** `ThemeContext`, no `AppShell` IconButton, no `localStorage` `theme` key — all deferred to `theme-context-unified`. This is called out as a **known temporary inconsistency** with PRD §6.12 (theme infrastructure) and is the cost of staying under the 400-line review budget.

### Test strategy (strict TDD)

For each new module: failing test first → minimum code to pass → refactor.

- **Vitest** (per hook/util/component): `useBJJDashboard` query keys + invalidation, `useConfirmRolls` upsert shape, `categoryLabel()` helper, position vocabulary lookup, time-window resolver, `RollReviewPanel` per-row interactions.
- **Deno** (`supabase/functions/bjj-section-ai/__tests__/`): contract test for `rolls[]` shape; mock fallback emits `rolls: []`; `isValidAIResponse` guard rejects bad shapes.
- **Playwright E2E** (`e2e/`): seed → open `/bjj/dashboard` → assert all 5 widgets render with counts → enhance a sparring section → confirm rolls → re-open dashboard → count updated. Theme does not toggle in MVP, so no MUI/Tailwind sync E2E.
- **RLS round-trip** (Vitest + test Supabase): user A cannot read user B's `bjj_roll_events`.

## Resolved decisions

| # | Question | Decision | Justification |
|---|----------|----------|---------------|
| 1 | Backfill UX (bulk vs banner) | **One-time migration + informational banner on next dashboard visit** | Fits US-49 "in-a-hurry" persona — banner is non-blocking; tapping it lists unconfirmed sessions. Idempotent migration follows the `20260514000004_backfill_practice_log.sql` precedent. |
| 2 | Position vocabulary | **`bjj_positions` lookup table** with `(key text pk, display_en text, display_es text)` | Free text is unsafe (AI variance: "knee on belly" vs `knee_on_belly`); CHECK constraint is brittle. Lookup table is the canonical source for the form select AND the display labels, and can grow without migrations. |
| 3 | Category labels map | **One `Record<'en' \| 'es', Record<BJJCategory, string>>` + `categoryLabel(category, locale)` helper** in `src/features/bjj/category-labels.ts` | Single source of truth; future i18n hooks; matches the `BJJCategory` Zod enum already in `bjj.schema.ts`. |
| 4 | Historical backfill trigger | **One-time migration + banner on next dashboard visit** | Migration is silent and idempotent; banner is informational. Opt-in modal interrupts the dashboard visit — worse for the "in-a-hurry" persona. |
| 5 | Submission given vs received | **Keep one `submission` outcome; infer direction from `role`** | A given submission = `role = 'attacking'`; a received submission = `role = 'defending'`. Adding a given/received split doubles the schema, the UI, and the aggregation logic — out of scope for MVP. |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/` | New | 4 migrations: `bjj_roll_events` (table/enums/indexes/RLS), `bjj_positions` lookup, `bjj_dashboard_views` (3 views), `bjj_dashboard_rpc` (1 RPC), `bjj_roll_events_backfill` (idempotent). |
| `supabase/functions/bjj-section-ai/` | Modified | `index.ts` + `prompt.ts` + `isValidAIResponse` guard + `buildMockResponse` fallback. New `__tests__/parse_rolls.test.ts`. |
| `src/features/bjj/dashboard/` | New | Full feature folder per PRD §8.1. |
| `src/features/bjj/category-labels.ts` | New | Shared bilingual map + helper. |
| `src/features/bjj/components/BJJSectionEditor.tsx` | Modified | Host `RollReviewPanel` inline; extend `AIPreview` interface with `rolls`. |
| `src/features/bjj/progression/components/ProgressionSection.tsx` | Modified | Supersede inline Spanish labels with `categoryLabel('es', key)`. |
| `src/app/router.tsx` | Modified | Add `/bjj/dashboard` (lazy), `Suspense` skeleton. |
| `src/app/AppShell.tsx` | Modified | Add "BJJ Dashboard" to desktop nav + `NAV_ITEMS`. |
| `src/components/react-bits/` | New | `CountUp`, `FadeContent`, `AnimatedContent`. |
| `package.json` | Modified | Add MUI v6 + emotion + x-charts + fontsource. |
| `vite.config.ts` | Modified | Add `@mui/material` to `optimizeDeps.include` if needed; tree-shaking verified. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| MUI + Tailwind class collision on the dashboard route | Medium | Port `template.html` to `material-dashboard.css` (PRD §6.10.1 preferred path) and mount MUI `ThemeProvider` at the page boundary; `ScopedCssBaseline` if any leak surfaces. |
| AI proposes wrong rolls → misleading flow charts | Medium | `RollReviewPanel` is the mandatory path; `confidence` shown per row; skip is one click; `status = 'proposed'` rows never appear in dashboard aggregations. |
| Users skip review consistently → empty roll widgets | Medium | Banner "X sparring sessions without confirmed roll data" with link to list; widgets render an empty state copy explaining why. |
| RLS leakage on `bjj_roll_events` | Low | Mirror `bjj_section_techniques` 3-table join pattern; add a Vitest RLS round-trip in the test suite. |
| `position_to` text variance breaks roll flow aggregation | Medium | `bjj_positions` lookup table normalizes at form/AI prompt; server-side guard in RPC for safety. |
| MUI bundle size inflates initial app load | Low | `React.lazy` + `Suspense` skeleton (NFR-05); verify `optimizeDeps`; track with `vite-bundle-visualizer` if size regresses. |
| Historical backfill noise (many proposed rolls in one shot) | Low | Idempotent `ON CONFLICT DO NOTHING`; backfill inserts `status = 'proposed'` — never auto-confirmed. |
| Strict TDD friction: writing the MUI test harness costs time | Medium | First TDD commit establishes the MUI test wrapper (`renderWithMuiTheme`) as a reusable util. |

## Acceptance criteria

- [ ] `/bjj/dashboard` renders 5 widgets matching Open Design grid spans, English copy, and component dimensions.
- [ ] Time filter (7d/30d/90d/10r) applies to all widgets; default last 30 days; persisted in `localStorage`.
- [ ] `useBJJDashboard(window)` returns `BJJDashboardData` matching PRD §6.11 schema; underlying RPC is `bjj_dashboard_data(p_window, p_start, p_end)`.
- [ ] Last techniques and technique types widgets read from existing `technique_practice_log` + `bjj_section_techniques` (no schema change to those).
- [ ] `bjj-section-ai` returns `rolls[]` for sparring sections; mock fallback emits `rolls: []`.
- [ ] `RollReviewPanel` supports confirm-all, save-edits, add-roll, delete-row, skip; re-enhance replaces only `proposed` rows.
- [ ] Confirmed rolls persist to `bjj_roll_events` with RLS; confirmed rolls survive workout delete via existing `ON DELETE CASCADE` chain.
- [ ] Banner shows "X sparring sessions without confirmed roll data" on dashboard when applicable.
- [ ] MUI v6 + Material tokens from `material-dashboard.css`; visual parity with `template.html`.
- [ ] Code-split via `React.lazy`; NFR-01 p95 < 2s for 90 days of data.
- [ ] WCAG 2.2 AA: chart segments have text labels; keyboard nav for drill-downs (NFR-03); axe-core reports 0 critical violations.
- [ ] ≥2 React Bits components used (CountUp on hero, FadeContent on widget mount) with `prefers-reduced-motion` fallback.
- [ ] Vitest + Deno + Playwright suites green; RLS round-trip test passes.
- [ ] **Theme toggle (dark/light/system + localStorage + AppShell IconButton) is explicitly DEFERRED to follow-up `theme-context-unified`** — current PR ships `prefers-color-scheme` only on the dashboard route.

## Rollback Plan

1. `DROP TABLE IF EXISTS bjj_roll_events CASCADE; DROP VIEW IF EXISTS bjj_dashboard_role_balance, bjj_dashboard_outcomes, bjj_dashboard_position_transitions CASCADE; DROP FUNCTION IF EXISTS bjj_dashboard_data CASCADE; DROP TABLE IF EXISTS bjj_positions CASCADE;` — reverts all new DB objects.
2. Revert `supabase/functions/bjj-section-ai/` to previous response shape (remove `rolls[]`).
3. Remove `src/features/bjj/dashboard/`, `src/components/react-bits/`, `src/features/bjj/category-labels.ts`.
4. Revert `BJJSectionEditor.tsx` and `AppShell.tsx` to prior state.
5. Remove MUI deps from `package.json` and `vite.config.ts`; `npm install`.
6. Users return to: no dashboard, original AI enhance flow, original category labels (Spanish inline).

## Dependencies

- Iteration 7 (`technique_practice_log`, `bjj_section_techniques`, `TechniquePracticeModal`) — all shipped.
- Iteration 4 (`bjj_sections`, `bjj-section-ai` Edge Function) — all shipped.
- Iteration 6 (Blue Belt category enum) — all shipped.
- Supabase Auth + RLS — all operational.
- React Bits (no npm install) — copy-paste per PRD §6.13.

## Success Criteria

- [ ] All acceptance criteria above pass.
- [ ] `npm test` green; `npm run test:e2e` green; `npm run lint` clean; `npm run build` succeeds.
- [ ] No RLS violations on `bjj_roll_events` in the test environment.
- [ ] PR diff under 400 lines (per review budget) — likely requires chained PRs (DB → API/EF → UI) per `sdd-tasks` forecast.

## Follow-up change

- **`theme-context-unified`** — introduce `src/theme/ThemeContext.tsx` with `light | dark | system` mode, persist to `localStorage` `theme`, add `IconButton` toggle in `AppShell` header, sync `<html class="dark">` (shadcn) with MUI `palette.mode` (dashboard route). This change is intentionally deferred to keep Iteration 8 review-focused and under the 400-line budget.
