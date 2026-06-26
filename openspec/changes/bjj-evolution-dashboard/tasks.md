# Tasks: BJJ Evolution Dashboard

> **Change**: `bjj-evolution-dashboard` · **Strict TDD active** (vitest + Deno + Playwright) · **PR strategy**: 9 chained PRs, stacked-to-main · **Source of truth**: `openspec/changes/bjj-evolution-dashboard/design.md`

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2080 total across 9 chained PRs |
| 400-line budget risk | High |
| Chained PRs recommended | Yes (9 PRs, stacked-to-main) |
| Suggested split | Phase A → B → C1 → C2 → D1 → D2 → E → F → G |
| Delivery strategy | ask-always (user approved chained) |
| Chain strategy | stacked-to-main |
| Verification gates | per-PR: `npm run lint && npm run test && npm run build`; per-Phase: Deno EF tests; per-change: `sdd-verify` |

Decision needed before apply: No (user pre-approved chained in orchestrator preflight)
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Base branch | Notes |
|------|------|-----------|-------------|-------|
| 1 | DB: table + enums + RLS + views + RPC + positions seed | PR 1 | `main` | SQL only, no app code |
| 2 | EF extension + Zod + backfill migration | PR 2 | `main` (PR 1) | Extends `bjj-section-ai` |
| 3 | Folder + tokens + CSS + theme shim + React Bits | PR 3 | `main` (PR 2) | MUI scaffold; no route yet |
| 4 | MUI deps + vite optimizeDeps + test util | PR 4 | `main` (PR 3) | Prereq for D1 |
| 5 | Dashboard shell: page + filter + header + footer + nav + hook | PR 5 | `main` (PR 4) | Skeleton-first, 1 widget ok |
| 6a | D2 widgets part 1: LastTechniques + TechniqueTypes | PR 6a | `main` (PR 5) | 2 widgets, ~250 lines |
| 6b | D2 widgets part 2: RoleBalance + Outcomes + RollFlow | PR 6b | `main` (PR 6a) | 3 widgets, ~350 lines |
| 7 | Roll Review: panel + persist + invalidation | PR 7 | `main` (PR 6b) | `BJJSectionEditor` integration |
| 8 | Backfill banner + count query + skip-on-visit | PR 8 | `main` (PR 7) | Informational only |
| 9 | E2E + a11y + bundle + perf + docs | PR 9 | `main` (PR 8) | Polish & verify gate |

> **Why split D2 into D2a + D2b**: PR 6 (Phase D2) was forecast at ~450 lines — over budget. Splitting into 2 PRs keeps each under 350. **Final count: 9 PRs (matching the orchestrator brief).**

---

## Global rules

- **Strict TDD per task**: every implementation task is preceded by a failing test commit in the same PR. Commits follow RED (test) → GREEN (feat) → REFACTOR pattern.
- **Commit size**: ≤400 lines per commit. Use the `work-unit-commits` skill conventions.
- **Conventional commits**: `feat`, `test`, `chore`, `refactor`, `fix`, `docs`. No `Co-Authored-By`.
- **Test location**: Vitest specs go in `__tests__/` sibling or `.test.ts(x)` co-located; Deno specs in `supabase/functions/bjj-section-ai/__tests__/`.
- **CSS isolation**: `src/features/bjj/dashboard/` is a **Tailwind-utility-free zone** (only `.widget`, `.tech-row`, etc. + `clsx`).
- **localStorage keys**: `bjj-dashboard-window` (filter preset). No `theme` key in this change (deferred).
- **Per-PR gate**: `npm run lint && npm run test && npm run build` must be green.

---

## PR 1 — Phase A: Database (table + enums + RLS + views + RPC + positions seed)

**Goal**: Land all 4 SQL migrations; no app code. Deployed to staging before PR 2.
**Depends on:** none
**Forecast lines:** ~300 (4 SQL files, each migrates cleanly on a fresh DB)
**Stacked-to-main:** yes
**Acceptance:**
- [ ] `bjj_roll_events` table exists with 4 enums, 3 indexes, unique `(section_id, roll_index)`, RLS
- [ ] `bjj_positions` table seeded with 11 rows, RLS read-only for authenticated
- [ ] 3 views `bjj_dashboard_role_balance`, `bjj_dashboard_outcomes`, `bjj_dashboard_position_transitions` exist
- [ ] `bjj_dashboard_data(p_window, p_start, p_end)` RPC returns `BJJDashboardData` JSONB shape
- [ ] Staging verification: `select bjj_dashboard_data('30d');` returns valid JSON

#### Tasks

1. **T1.1 — Test: migration 1 creates `bjj_roll_events`** (test, ~30 lines)
   - File: `supabase/migrations/__tests__/20260612000001_bjj_roll_events.test.sql` (pgTAP-style) or hand-verify on staging
   - Done when: `select count(*) from information_schema.tables where table_name='bjj_roll_events'` = 1; `enum_range(null::bjj_roll_role)` = 3 values
2. **T1.2 — Migration 1: `20260612000001_bjj_roll_events.sql`** (feat, ~110 lines)
   - Implements 4 enums + table + 3 indexes + unique constraint + 4 RLS policies + updated_at trigger
   - Done when: re-running is idempotent (`create type` wrapped in DO block)
3. **T1.3 — Migration 2: `20260612000002_bjj_positions.sql`** (feat, ~40 lines)
   - 4-column lookup + RLS read-only for authenticated + 11-row seed `ON CONFLICT DO NOTHING`
   - Done when: `select count(*) from bjj_positions` = 11
4. **T1.4 — Test: 3 views return correct shape on seeded data** (test, ~40 lines)
   - File: `supabase/migrations/__tests__/bjj_dashboard_views.test.sql`
   - Seed 10 confirmed + 5 proposed rolls; assert views return only confirmed (10)
5. **T1.5 — Migration 3: `20260612000003_bjj_dashboard_views.sql`** (feat, ~30 lines)
   - 3 `create or replace view` definitions, all filter `r.status='confirmed' AND w.type='bjj'`
6. **T1.6 — Test: `bjj_dashboard_data` RPC returns `BJJDashboardData` for 30d/90d/10r** (test, ~80 lines)
   - File: `supabase/migrations/__tests__/bjj_dashboard_rpc.test.sql`
   - Cover: 30d window, 90d window, 10r window (last 10 workouts with ≥1 confirmed roll), unknown_window raises P0001, `auth.uid()` enforced, proposed rolls excluded from all aggregates
7. **T1.7 — Migration 4: `20260612000004_bjj_dashboard_rpc.sql`** (feat, ~150 lines)
   - `SECURITY DEFINER` plpgsql function; window resolution (`7d`/`30d`/`90d`/`10r`); LEFT JOIN to `bjj_positions` for display labels; `RAISE EXCEPTION 'UNAUTHENTICATED'` when `auth.uid() is null`; `to_char(now() at time zone 'UTC', 'Mon DD, YYYY · HH:MI AM')` for `generated_at`
8. **T1.8 — Test: RLS round-trip on `bjj_roll_events`** (test, ~30 lines)
   - Two-user seed; user A reads → only own rows; user A inserts into user B's section → rejected
   - File: `supabase/migrations/__tests__/bjj_roll_events_rls.test.sql`

#### Commit plan

- **c1:** `test(db): add pgTAP-style shape tests for bjj_roll_events migration` — T1.1
- **c2:** `feat(db): create bjj_roll_events table with 4 enums, indexes, RLS` — T1.2
- **c3:** `feat(db): create bjj_positions lookup table with seed and RLS` — T1.3
- **c4:** `test(db): add tests for 3 dashboard views filtering confirmed rolls` — T1.4
- **c5:** `feat(db): add bjj_dashboard_role_balance/outcomes/position_transitions views` — T1.5
- **c6:** `test(db): add bjj_dashboard_data RPC contract tests for 30d/90d/10r/unknown_window` — T1.6
- **c7:** `feat(db): add bjj_dashboard_data SECURITY DEFINER RPC composing views + technique aggregates` — T1.7
- **c8:** `test(db): add RLS round-trip test for bjj_roll_events` — T1.8

#### PR checklist

- [ ] `supabase db reset` (staging) runs clean
- [ ] All 8 migration tests pass on staging
- [ ] No app code touched
- [ ] PR description links to REQ-RE1..RE5, REQ-PV1, REQ-PV2, REQ-PV8

---

## PR 2 — Phase B: Edge Function + Zod + backfill

**Goal**: `bjj-section-ai` returns `rolls[]`; Zod validates; backfill migration proposes sparring-section rows.
**Depends on:** PR 1 (RPC + positions table must exist)
**Forecast lines:** ~250
**Stacked-to-main:** yes
**Acceptance:**
- [ ] `BJJSectionAIResponse.rolls[]` present in mock + LLM paths
- [ ] `isValidAIResponse` rejects bad `confidence` / unknown `position_from`
- [ ] `buildMockResponse` emits `rolls: []`
- [ ] `BJJRollProposalSchema` + `BJJSectionAIResponseSchema` exported from `bjj.schema.ts`
- [ ] Backfill migration proposes 1 row per sparring section without roll events (idempotent)
- [ ] Deno tests pass for new contract

#### Tasks

1. **T2.1 — Test: `BJJRollProposalSchema` rejects bad shape** (test, ~40 lines)
   - File: `src/features/bjj/__tests__/bjj.schema.rolls.test.ts`
   - Assert: `confidence: 1.5` → ZodError; `position_to: 123` → ZodError; missing `roll_index` → ZodError
2. **T2.2 — Add Zod schemas to `src/features/bjj/bjj.schema.ts`** (feat, ~30 lines)
   - `BJJRollProposalSchema` + `BJJSectionAIResponseSchema` exports
3. **T2.3 — Test: `buildMockResponse` emits `rolls: []`** (test, ~15 lines)
   - File: `supabase/functions/bjj-section-ai/__tests__/buildMockResponse.test.ts`
   - Assert: `mockResponse.rolls` is an empty array
4. **T2.4 — Update `bjj-section-ai/index.ts`: extend `BJJSectionAIResponse` + `buildMockResponse` + `isValidAIResponse`** (feat, ~50 lines)
   - `BJJSectionAIResponse.rolls: BJJRollProposal[]`; `buildMockResponse` adds `rolls: []`; `isValidAIResponse` validates `rolls` array shape (every `roll_index` positive int, every `confidence` in `[0,1]`)
5. **T2.5 — Test: `isValidAIResponse` accepts/rejects `validation_error` rows** (test, ~20 lines)
   - File: `supabase/functions/bjj-section-ai/__tests__/isValidAIResponse.test.ts`
   - Assert: `position_from='knee_on_belly_pizza'` with `validation_error='unknown_position_from'` → accepted; `confidence: 1.5` → rejected
6. **T2.6 — Update `prompt.ts`: add roll-capture rules + canonical position list** (feat, ~40 lines)
   - Append roll-proposal block; inline 11 position keys; "fewer high-confidence rolls" rule
7. **T2.7 — Update `useBJJSectionAI.ts`: parse `rolls[]` via Zod** (feat, ~25 lines)
   - `BJJSectionAIResult.rolls: BJJRollProposal[]`; `BJJSectionAIResponseSchema.safeParse` on response; surface Zod issues as typed error
8. **T2.8 — Test: `useBJJSectionAI` Zod-parses response** (test, ~30 lines)
   - File: `src/features/bjj/__tests__/useBJJSectionAI.rolls.test.ts`
   - Mock `supabase.functions.invoke`; assert `rolls` flows through; bad response → typed error
9. **T2.9 — Test: backfill idempotency** (test, ~25 lines)
   - File: `supabase/migrations/__tests__/bjj_roll_events_backfill.test.sql`
   - Seed 12 sparring + 8 non-sparring sections; run migration; assert 12 proposed rows; re-run → 0 new
10. **T2.10 — Migration 5: `20260612000005_bjj_roll_events_backfill.sql`** (feat, ~30 lines)
    - `INSERT … SELECT … WHERE goal/raw_description/ai_description ~* 'sparring|rolls|rondas|libre|posicional' AND NOT EXISTS`; `ON CONFLICT (section_id, roll_index) DO NOTHING`; placeholder `role='neutral' outcome='neutral' position_from='other' confidence=null source='manual'`

#### Commit plan

- **c1:** `test(bjj.schema): add BJJRollProposalSchema shape tests` — T2.1
- **c2:** `feat(bjj.schema): add BJJRollProposalSchema and BJJSectionAIResponseSchema` — T2.2
- **c3:** `test(ef): assert buildMockResponse emits rolls: []` — T2.3
- **c4:** `feat(ef): extend bjj-section-ai response with rolls[]; update mock + isValidAIResponse` — T2.4
- **c5:** `test(ef): isValidAIResponse accepts validation_error rows, rejects bad shapes` — T2.5
- **c6:** `feat(ef): extend system prompt with roll-capture rules and canonical positions` — T2.6
- **c7:** `feat(hooks): add rolls[] to useBJJSectionAI result and Zod-parse response` — T2.7 + T2.8 (test merged)
- **c8:** `test(db): assert backfill migration idempotency on seeded sparring sections` — T2.9
- **c9:** `feat(db): add bjj_roll_events backfill migration proposing rows for sparring sections` — T2.10

#### PR checklist

- [ ] Deno tests pass: `cd supabase/functions/bjj-section-ai && deno test --allow-net --allow-env __tests__/`
- [ ] Vitest tests pass: `npm test -- bjj.schema useBJJSectionAI`
- [ ] Staging: re-run backfill migration → 0 new rows
- [ ] PR description links to REQ-RE6, REQ-RE7, REQ-RE9

---

## PR 3 — Phase C1: UI scaffold (folder + tokens + CSS + shim + React Bits)

**Goal**: All theme utilities + React Bits land before any route; no MUI deps yet. App compiles but no `/bjj/dashboard` route exists.
**Depends on:** PR 2 (Zod schemas in `bjj.schema.ts`)
**Forecast lines:** ~250
**Stacked-to-main:** yes
**Acceptance:**
- [ ] `src/features/bjj/dashboard/theme/{material-tokens.ts, material-dashboard.css}` exist
- [ ] `src/features/bjj/dashboard/utils/{window.ts, rollFlow.ts, relativeTime.ts}` exist with unit tests
- [ ] `src/features/bjj/{category-labels.ts, position-vocabulary.ts}` exist with unit tests
- [ ] `src/components/react-bits/{CountUp, FadeContent, AnimatedContent, usePrefersReducedMotion}.ts(x)` exist
- [ ] `useDashboardColorScheme` hook + unit test
- [ ] `vitest matchMedia` polyfill registered in `src/test/setup.ts`

#### Tasks

1. **T3.1 — Test: `categoryLabel` returns EN/ES correctly** (test, ~25 lines)
   - File: `src/features/bjj/__tests__/category-labels.test.ts`
   - Assert: `categoryLabel('submission','en')` = `Submissions`; `categoryLabel('submission','es')` = `Sumisiones`; `categoryLabel('submission','fr')` TS error
2. **T3.2 — `src/features/bjj/category-labels.ts`** (feat, ~40 lines)
   - `Record<'en'|'es', Record<BJJCategory, string>>` + `categoryLabel(category, locale)` helper
3. **T3.3 — Test: `getPositionLabel` returns EN/ES, falls back to `other` in prod** (test, ~30 lines)
   - File: `src/features/bjj/__tests__/position-vocabulary.test.ts`
   - Assert: `getPositionLabel('mount','en')` = `Mount`; `getPositionLabel('mount','es')` = `Montada`; unknown key in prod → `Other` + console.warn; unknown in dev/test → throws
4. **T3.4 — `src/features/bjj/position-vocabulary.ts`** (feat, ~50 lines)
   - `BJJPositionKey` union (11+ keys); `getPositionLabel(key, locale)`; dev-throw / prod-warn branching on `import.meta.env.DEV`
5. **T3.5 — Update `ProgressionSection.tsx` to use `categoryLabel('es', key)`** (refactor, ~10 lines)
   - Replace inline Spanish `categoryLabels` map (lines 171–177); supersede with shared map
6. **T3.6 — Test: `resolveWindow` maps preset → date range** (test, ~25 lines)
   - File: `src/features/bjj/dashboard/__tests__/utils/window.test.ts`
   - Assert: `resolveWindow('7d')` → `{ startDate: today-7, endDate: today, workoutLimit: null }`; `resolveWindow('10r')` → `{ workoutLimit: 10, startDate: null }`; `resolveWindow('invalid')` throws
7. **T3.7 — `src/features/bjj/dashboard/utils/window.ts`** (feat, ~25 lines)
8. **T3.8 — Test: `normalizeEdgePct` normalizes to max** (test, ~20 lines)
   - File: `src/features/bjj/dashboard/__tests__/utils/rollFlow.test.ts`
   - Assert: `[{count:10},{count:3}]` → `[100, 30]`; `[]` → `[]`; single → `[100]`
9. **T3.9 — `src/features/bjj/dashboard/utils/rollFlow.ts`** (feat, ~20 lines)
10. **T3.10 — Test: `formatRelativeTime` uses `Intl.RelativeTimeFormat('en')`** (test, ~20 lines)
    - File: `src/features/bjj/dashboard/__tests__/utils/relativeTime.test.ts`
    - Assert: 3 days ago → `"3 days ago"`; 1 day ago → `"yesterday"`
11. **T3.11 — `src/features/bjj/dashboard/utils/relativeTime.ts`** (feat, ~15 lines)
12. **T3.12 — `src/features/bjj/dashboard/theme/material-tokens.ts`** (feat, ~80 lines)
    - Typed export of all CSS vars (light + dark): colors, type scale, spacing, radii, elevation, category color tokens
13. **T3.13 — `src/features/bjj/dashboard/theme/material-dashboard.css`** (feat, ~80 lines)
    - Port of `template.html` lines 7–328: `.page`, `.page-head`, `.segmented`, `.refresh-btn`, `.widget`, `.span-2/3/4/6`, `.tech-list`, `.tech-row`, `.donut`, `.legend`, `.role-stacked`, `.outcome-grid`, `.outcome-tile`, `.flow-row`, `.flow-bar`, `.banner`, `.foot`, `:root` + `.dark` vars
14. **T3.14 — `src/components/react-bits/usePrefersReducedMotion.ts`** (feat, ~20 lines)
    - `matchMedia('(prefers-reduced-motion: reduce)')` hook
15. **T3.15 — Test: `usePrefersReducedMotion` follows `matchMedia` change events** (test, ~20 lines)
    - File: `src/components/react-bits/__tests__/usePrefersReducedMotion.test.ts`
16. **T3.16 — `src/components/react-bits/CountUp.tsx`** (feat, ~40 lines, copy-paste from reactbits.dev)
    - Static fallback when `usePrefersReducedMotion()` returns true (no layout shift)
17. **T3.17 — `src/components/react-bits/FadeContent.tsx`** (feat, ~30 lines, copy-paste)
18. **T3.18 — `src/components/react-bits/AnimatedContent.tsx`** (feat, ~30 lines, copy-paste)
19. **T3.19 — `src/features/bjj/dashboard/theme/useDashboardColorScheme.ts`** (feat, ~25 lines)
    - `useState` + `matchMedia` listener; returns `'light' | 'dark'`; document comment noting this is the **seam** for `theme-context-unified`
20. **T3.20 — Test: `useDashboardColorScheme` follows `matchMedia`** (test, ~25 lines)
    - File: `src/features/bjj/dashboard/__tests__/theme/useDashboardColorScheme.test.ts`
    - Assert: initial = matchMedia.matches; emits `change` event → updates state
21. **T3.21 — Update `src/test/setup.ts`: add `matchMedia` polyfill** (chore, ~10 lines)
    - Required for jsdom tests using `usePrefersReducedMotion` + `useDashboardColorScheme`

#### Commit plan (consolidated, ≤400 lines each)

- **c1:** `test(utils): add category-labels, position-vocabulary, resolveWindow, normalizeEdgePct, formatRelativeTime tests` — T3.1, T3.3, T3.6, T3.8, T3.10
- **c2:** `feat(utils): add category-labels, position-vocabulary, window, rollFlow, relativeTime utils` — T3.2, T3.4, T3.7, T3.9, T3.11
- **c3:** `refactor(progression): use shared category-labels map in ProgressionSection` — T3.5
- **c4:** `feat(theme): add material-tokens.ts and material-dashboard.css port` — T3.12, T3.13
- **c5:** `feat(react-bits): add usePrefersReducedMotion hook with tests` — T3.14, T3.15
- **c6:** `feat(react-bits): add CountUp, FadeContent, AnimatedContent copy-paste components` — T3.16, T3.17, T3.18
- **c7:** `feat(theme): add useDashboardColorScheme shim hook with tests` — T3.19, T3.20
- **c8:** `chore(test): add matchMedia polyfill to vitest setup` — T3.21

#### PR checklist

- [ ] `npm test -- category-labels position-vocabulary window rollFlow relativeTime usePrefersReducedMotion useDashboardColorScheme` passes
- [ ] `npm run lint` clean (no `unused-vars` from new exports)
- [ ] `npm run build` clean (no broken imports)
- [ ] App still boots at `/workouts` (no route changes)
- [ ] PR description links to REQ-PV3, REQ-PV4, REQ-PV5, REQ-BD9, REQ-BD7

---

## PR 4 — Phase C2: MUI dependencies + theme + vite config

**Goal**: Install MUI v6 + emotion + fontsource; build `mui-dashboard-theme.ts` from tokens; register `optimizeDeps` in vite.
**Depends on:** PR 3 (tokens + CSS exist)
**Forecast lines:** ~150 (deps mostly; theme ~80 lines)
**Stacked-to-main:** yes
**Acceptance:**
- [ ] `@mui/material`, `@emotion/react`, `@emotion/styled`, `@fontsource-variable/roboto`, `@fontsource-variable/roboto-mono` in `package.json` (no `@mui/x-charts` import — declared but deferred)
- [ ] `vite.config.ts` adds MUI packages to `optimizeDeps.include`
- [ ] `src/features/bjj/dashboard/theme/mui-dashboard-theme.ts` exports `createDashboardTheme(mode)`
- [ ] `src/features/bjj/dashboard/theme/renderWithMuiTheme.tsx` test util exists with smoke test
- [ ] `npm run build` succeeds; `npm run dev` boots without MUI warning

#### Tasks

1. **T4.1 — Install MUI deps** (chore, `package.json` only)
   - `npm install @mui/material@^6 @emotion/react@^11 @emotion/styled@^11 @fontsource-variable/roboto @fontsource-variable/roboto-mono`
   - Also add `@mui/x-charts` to `package.json` (declared, unused — design §8 deferred)
2. **T4.2 — Update `vite.config.ts`: add MUI to `optimizeDeps.include`** (chore, ~5 lines)
3. **T4.3 — Test: `createDashboardTheme('dark')` includes dark palette tokens** (test, ~30 lines)
   - File: `src/features/bjj/dashboard/__tests__/theme/mui-dashboard-theme.test.ts`
   - Assert: `theme.palette.mode === 'dark'`; `theme.palette.background.default` matches dark token; `theme.typography.fontFamily` matches tokens
4. **T4.4 — `src/features/bjj/dashboard/theme/mui-dashboard-theme.ts`** (feat, ~80 lines)
   - `createDashboardTheme(mode: 'light' | 'dark')` returning `createTheme({ palette, typography, components })` from `material-tokens.ts`; CssBaseline-friendly defaults
5. **T4.5 — Test: `renderWithMuiTheme` renders child with provider** (test, ~20 lines)
   - File: `src/features/bjj/dashboard/__tests__/theme/renderWithMuiTheme.test.tsx`
   - Assert: child `<div data-testid="x">` renders; no theme context error
6. **T4.6 — `src/features/bjj/dashboard/theme/renderWithMuiTheme.tsx`** (feat, ~25 lines)
   - Test util: `renderWithMuiTheme(ui, { mode: 'light' })` wrapping in `ThemeProvider`

#### Commit plan

- **c1:** `chore(deps): install MUI v6, emotion, fontsource packages` — T4.1
- **c2:** `chore(vite): add @mui/material to optimizeDeps.include` — T4.2
- **c3:** `test(theme): add createDashboardTheme dark/light palette contract tests` — T3+T4.3
- **c4:** `feat(theme): add mui-dashboard-theme.ts with light/dark palettes from tokens` — T4.4
- **c5:** `test(theme): add renderWithMuiTheme util smoke test` — T4.5
- **c6:** `feat(theme): add renderWithMuiTheme test util` — T4.6

#### PR checklist

- [ ] `npm run build` clean (no MUI resolution errors)
- [ ] `npm run dev` boots, `/workouts` still renders (no MUI side effects on non-dashboard routes)
- [ ] PR description links to REQ-BD7, NFR-05

---

## PR 5 — Phase D1: Dashboard shell (page + filter + header + footer + nav + hook)

**Goal**: `/bjj/dashboard` route resolves, renders page header + filter + footer + 1 working widget (LastTechniques); skeleton for the other 4.
**Depends on:** PR 4 (MUI theme must exist)
**Forecast lines:** ~350
**Stacked-to-main:** yes
**Acceptance:**
- [ ] `BJJDashboardPage` renders inside `<Outlet />`; MUI `ThemeProvider` mounted at page boundary
- [ ] `DashboardPageHeader`, `DashboardTimeFilter`, `DashboardFooter`, `DashboardSkeleton` components
- [ ] `DashboardWidgetShell` (with `<ErrorBoundary>` + skeleton + empty state)
- [ ] `useBJJDashboard(window)` hook + tests; `bjjDashboardKeys` factory
- [ ] Router: lazy import + `Suspense` skeleton; AppShell nav entry (desktop + `NAV_ITEMS`)
- [ ] `LastTechniquesWidget` renders real data (proves end-to-end pipeline)
- [ ] Visual parity review: screenshot vs `template.html` for header/filter/footer

#### Tasks

1. **T5.1 — `src/features/bjj/dashboard/types/dashboard.types.ts`** (feat, ~80 lines) ✅
   - `BJJDashboardData`, `BJJDashboardWindow`, `BJJRollProposal`, `LastTechniquesData`, `TechniqueTypesData`, `RoleBalanceData`, `OutcomesData`, `RollFlowData` — matching PRD §6.11
2. **T5.2 — Test: `bjjDashboardKeys` factory** (test, ~15 lines) ✅
   - File: `src/features/bjj/dashboard/__tests__/hooks/bjjDashboardKeys.test.ts`
   - Assert: `bjjDashboardKeys.summary('30d')` = `['bjj-dashboard', '30d']`
3. **T5.3 — `src/features/bjj/dashboard/hooks/useBJJDashboard.ts`** (feat, ~50 lines) ✅
   - `useQuery({ queryKey: bjjDashboardKeys.summary(window), queryFn: () => supabase.rpc('bjj_dashboard_data', { p_window: window }), staleTime: 60_000 })`; export `bjjDashboardKeys`
4. **T5.4 — Test: `useBJJDashboard` calls RPC and sets staleTime** (test, ~30 lines) ✅
   - File: `src/features/bjj/dashboard/__tests__/hooks/useBJJDashboard.test.ts`
   - Mock `supabase.rpc`; assert call args + queryKey; assert `staleTime: 60_000`
5. **T5.5 — `src/features/bjj/dashboard/components/DashboardPageHeader.tsx`** (feat, ~30 lines) ✅
   - `<Stack>` eyebrow + h1 + subtitle; uses `.page-head` class; reads `data.subtitle`
6. **T5.6 — Test: `DashboardPageHeader` renders subtitle** (test, ~15 lines) ✅
7. **T5.7 — `src/features/bjj/dashboard/components/DashboardTimeFilter.tsx`** (feat, ~60 lines) ✅
   - MUI `ToggleButtonGroup` with 4 presets + Refresh `IconButton`; reads/writes `localStorage['bjj-dashboard-window']`; default `'30d'`; calls `onChange`/`onRefresh`
8. **T5.8 — Test: `DashboardTimeFilter` reads localStorage on mount, writes on change** (test, ~30 lines) ✅
9. **T5.9 — `src/features/bjj/dashboard/components/DashboardFooter.tsx`** (feat, ~15 lines) ✅
   - "Live data · last updated …" text with `generated_at` prop
10. **T5.10 — `src/features/bjj/dashboard/components/DashboardSkeleton.tsx`** (feat, ~30 lines) ✅
    - 5-card grid skeleton matching desktop spans
11. **T5.11 — `src/features/bjj/dashboard/components/DashboardWidgetShell.tsx`** (feat, ~50 lines) ✅
    - Props `{ span, data, isLoading, error, onRetry, children }`; renders skeleton/empty state/error fallback; `react-error-boundary` `ErrorBoundary` per widget
12. **T5.12 — `src/features/bjj/dashboard/components/LastTechniquesWidget.tsx`** (feat, ~80 lines) ✅
    - Hero `<CountUp>` total + 5–10 row list; row click → `TechniquePracticeModal`; uses `usePrefersReducedMotion`
13. **T5.13 — Test: `LastTechniquesWidget` renders mock data, opens modal on row click** (test, ~40 lines) ✅
14. **T5.14 — `src/features/bjj/dashboard/pages/BJJDashboardPage.tsx`** (feat, ~90 lines) ✅
    - Page wrapper: imports `material-dashboard.css` + Roboto font; `<ThemeProvider theme={createDashboardTheme(mode)}>`; `<DashboardBackfillBanner>` (placeholder for PR 8); `<DashboardPageHeader>`; `<DashboardTimeFilter>`; `<DashboardGrid>` with 5 `<DashboardWidgetShell>` (only LastTechniques real; other 4 are stubbed with empty-state copy); `<DashboardFooter>`; uses `useDashboardColorScheme`
15. **T5.15 — Update `src/app/router.tsx`: add `/bjj/dashboard` lazy + Suspense** (feat, ~10 lines) ✅
    - Import `lazy`, `Suspense`; lazy-import `BJJDashboardPage`; insert route under `AppShell` children
16. **T5.16 — Update `src/app/AppShell.tsx`: add "BJJ Dashboard" to `NAV_ITEMS` + desktop nav** (feat, ~6 lines) ✅
17. **T5.17 — Playwright smoke test: dashboard loads with 1 widget** (test, ~40 lines) ✅
    - File: `e2e/bjj-dashboard.d1.spec.ts`
    - Seed 1 BJJ workout + 2 confirmed rolls + 2 techniques; assert page header + filter + 1 widget render

#### Commit plan

- **c1:** `feat(types): add BJJDashboardData and related TypeScript types` — T5.1 ✅
- **c2:** `test(hooks): add bjjDashboardKeys factory tests` — T5.2 ✅
- **c3:** `feat(hooks): add useBJJDashboard with bjjDashboardKeys query key factory` — T5.3 ✅ (split into c3+bjjDashboardKeys + c5+useBJJDashboard for separate RED+GREEN per file)
- **c4:** `test(hooks): assert useBJJDashboard calls RPC and sets 60s staleTime` — T5.4 ✅
- **c5:** `feat(dashboard): add DashboardPageHeader, DashboardFooter, DashboardSkeleton components with tests` — T5.5, T5.6, T5.9, T5.10 ✅ (split per component for separate RED+GREEN)
- **c6:** `feat(dashboard): add DashboardTimeFilter with localStorage persistence + tests` — T5.7, T5.8 ✅
- **c7:** `feat(dashboard): add DashboardWidgetShell with error boundary, skeleton, empty state` — T5.11 ✅
- **c8:** `feat(dashboard): add LastTechniquesWidget with CountUp hero + technique rows + tests` — T5.12, T5.13 ✅
- **c9:** `feat(dashboard): add BJJDashboardPage with MUI ThemeProvider, grid, 1 real widget + 4 stubs` — T5.14 ✅
- **c10:** `feat(router): lazy-import /bjj/dashboard with Suspense skeleton; add AppShell nav entry` — T5.15, T5.16 ✅
- **c11:** `test(e2e): Playwright smoke — dashboard loads with 1 widget and seeded data` — T5.17 ✅

#### PR checklist

- [ ] `npm run lint && npm test && npm run build` all clean
- [ ] Visual parity: screenshot of `/bjj/dashboard` matches `template.html` header/filter/footer
- [ ] `localStorage['bjj-dashboard-window']` persists across reload
- [ ] PR description links to REQ-BD1, REQ-BD2, REQ-BD3, REQ-BD4, REQ-BD5, REQ-BD7, REQ-BD8

---

## PR 6a — Phase D2 part 1: TechniqueTypes + LastTechniques (already done in PR 5) — *Re-scope*

**Note**: PR 5 already lands `LastTechniquesWidget`. PR 6a adds `TechniqueTypeWidget` + finishes the row 1 of the grid.

**Goal**: Complete row 1 of the grid (LastTechniques already done in PR 5; add TechniqueTypeWidget + shared `insight_rows` data).
**Depends on:** PR 5
**Forecast lines:** ~250
**Stacked-to-main:** yes
**Acceptance:**
- [x] `TechniqueTypeWidget` renders donut (custom SVG, no chart lib) + legend + insight rows
- [x] Drill-down: legend row click → `useNavigate('/bjj/blue-belt-progression?category={key}')`
- [x] Donut `dasharray`/`dashoffset` computed from `data.pct` (C=2πr, r=50)
- [ ] Visual parity: screenshot of donut matches `template.html` lines 460–500 (deferred to PR 6b when all 5 widgets render)

#### Tasks

1. **T6a.1 — `src/features/bjj/dashboard/components/TechniqueTypeWidget.tsx`** (feat, ~120 lines) ✅
   - Custom SVG donut (r=50, `strokeDasharray="X 314"` where X = `pct * 3.14`); legend with per-category chip + pct; insight rows from `data.insight_rows`
2. **T6a.2 — Test: `TechniqueTypeWidget` renders donut + legend; navigates on click** (test, ~40 lines) ✅
   - Mock `useNavigate`; assert legend click → call with `/bjj/blue-belt-progression?category=submission`
3. **T6a.3 — Test: `useBJJPositions` reads from `bjj_positions` ordered by `display_order`** (test, ~25 lines) ✅
   - File: `src/features/bjj/dashboard/__tests__/hooks/useBJJPositions.test.ts`
4. **T6a.4 — `src/features/bjj/dashboard/hooks/useBJJPositions.ts`** (feat, ~20 lines) ✅
   - `useQuery` with 1h staleTime; ordered by `display_order`
5. **T6a.5 — Playwright: legend click navigates to progression page** (test, ~25 lines) ✅
   - Extend `e2e/bjj-dashboard.d1.spec.ts`

#### Commit plan

- **c1:** `feat(hooks): add useBJJPositions with 1h staleTime + tests` — T6a.3, T6a.4
- **c2:** `feat(dashboard): add TechniqueTypeWidget with custom SVG donut + legend + tests` — T6a.1, T6a.2
- **c3:** `test(e2e): assert donut legend navigates to progression page` — T6a.5

#### PR checklist

- [ ] `npm run lint && npm test && npm run build` clean
- [ ] Donut SVG matches `template.html` colors and proportions
- [ ] PR description links to REQ-BD4, REQ-BD6, REQ-PV5

---

## PR 6b — Phase D2 part 2: RoleBalance + Outcomes + RollFlow

**Goal**: Complete rows 2 + 3 of the grid.
**Depends on:** PR 6a
**Forecast lines:** ~350
**Stacked-to-main:** yes
**Acceptance:**
- [ ] `RoleBalanceWidget` (row 2 left) with stacked bar + legend
- [ ] `OutcomesWidget` (row 2 right) with 2×2 tile grid
- [ ] `RollFlowWidget` (row 3 full width) with top 7 transitions + animated bars
- [ ] All 3 widgets render real data from RPC; empty state copy correct
- [ ] Visual parity: full dashboard screenshot vs `template.html`

#### Tasks

1. **T6b.1 — `src/features/bjj/dashboard/components/RoleBalanceWidget.tsx`** (feat, ~70 lines)
   - Stacked bar (flex, role % widths) + legend with per-role pct; reads `data.role_balance.segments`; empty copy "No rolls in window"
2. **T6b.2 — Test: `RoleBalanceWidget` renders stacked bar with correct widths** (test, ~30 lines)
3. **T6b.3 — `src/features/bjj/dashboard/components/OutcomesWidget.tsx`** (feat, ~80 lines)
   - 2×2 `<Grid>` of `outcome-tile` MUI `<Paper>` with `color-mix` tinted bg; tile click → navigate `/workouts?outcome={key}` (post-MVP: show info toast)
4. **T6b.4 — Test: `OutcomesWidget` renders 2×2 grid with token-matched colors** (test, ~30 lines)
5. **T6b.5 — `src/features/bjj/dashboard/components/RollFlowWidget.tsx`** (feat, ~100 lines)
   - Renders top 7 edges; each row is `120px 1fr 120px` (from / bar / to); `<AnimatedContent>` wraps the inner bar fill for width animation; bar width = `edge.pct%` (already normalized server-side); reads `data.roll_flow.edges`
6. **T6b.6 — Test: `RollFlowWidget` renders top 7 edges with normalized widths** (test, ~40 lines)
   - Assert: edge with `count: 10` renders `width: 100%`; edge with `count: 3` renders `width: 30%`
7. **T6b.7 — Update `BJJDashboardPage.tsx` to use all 5 widgets** (feat, ~20 lines)
   - Remove the 4 stub widgets; wire RoleBalance, Outcomes, RollFlow
8. **T6b.8 — Playwright: full dashboard smoke with all 5 widgets** (test, ~30 lines)
   - File: `e2e/bjj-dashboard.d2.spec.ts`
   - Seed 25 workouts + 12 confirmed rolls; assert all 5 widgets render with non-empty counts

#### Commit plan

- **c1:** `feat(dashboard): add RoleBalanceWidget with stacked bar + legend + tests` — T6b.1, T6b.2
- **c2:** `feat(dashboard): add OutcomesWidget with 2x2 tile grid + tests` — T6b.3, T6b.4
- **c3:** `feat(dashboard): add RollFlowWidget with top-7 edges and AnimatedContent bars + tests` — T6b.5, T6b.6
- **c4:** `feat(dashboard): wire all 5 widgets into BJJDashboardPage grid` — T6b.7
- **c5:** `test(e2e): Playwright smoke — all 5 widgets render with seeded data` — T6b.8

#### PR checklist

- [ ] `npm run lint && npm test && npm run build` clean
- [ ] Full dashboard screenshot matches `template.html` (pixel-level parity review)
- [ ] axe-core: 0 critical violations
- [ ] PR description links to REQ-BD4, REQ-BD5, REQ-BD6, REQ-BD9, REQ-BD10

---

## PR 7 — Phase E: Roll Review

**Goal**: `RollReviewPanel` renders inline in `BJJSectionEditor`; `useConfirmRolls` mutation persists and invalidates dashboard.
**Depends on:** PR 6b
**Forecast lines:** ~250
**Stacked-to-main:** yes
**Acceptance:**
- [ ] `BJJSectionEditor.AIPreview.rolls[]` populated after enhance
- [ ] `<RollReviewPanel>` renders below `<AIPreviewPanel>` when `rolls.length > 0`
- [ ] Actions: Confirm all (ai_confirmed), Save edits (ai_edited), Add roll (manual), Skip (no persist)
- [ ] `useConfirmRolls` upserts via `supabase.from('bjj_roll_events').upsert(...)` with `onConflict: 'section_id,roll_index'`
- [ ] On success: `invalidateQueries({ queryKey: bjjDashboardKeys.all })` + `unconfirmedSparringCount()`
- [ ] Validation warning chip on rows with `validation_error`

#### Tasks

1. **T7.1 — Test: `useConfirmRolls` upserts payload and invalidates on success** (test, ~50 lines)
   - File: `src/features/bjj/dashboard/__tests__/hooks/useConfirmRolls.test.ts`
   - Mock `supabase.from(...).upsert(...)`; assert payload shape (status, source, position_from, technique_ids); assert `invalidateQueries` called with `['bjj-dashboard']` AND `['bjj-dashboard', 'unconfirmed-sparring-count']`
2. **T7.2 — `src/features/bjj/dashboard/hooks/useConfirmRolls.ts`** (feat, ~70 lines)
   - Resolve `technique_names` to `technique_ids` via local map (query `bjj_techniques`); unknown position → `'other'` + `validation_error`; upsert with `onConflict: 'section_id,roll_index'`; pre-step `delete .eq('section_id', id).eq('status', 'proposed').gt('roll_index', newMax)`; invalidate on success
3. **T7.3 — Test: `RollReviewPanel` renders nothing when `rolls=[]`** (test, ~20 lines)
4. **T7.4 — Test: `RollReviewPanel` Confirm all calls mutation with `ai_confirmed`** (test, ~30 lines)
5. **T7.5 — Test: `RollReviewPanel` Save edits marks `ai_edited`** (test, ~30 lines)
6. **T7.6 — Test: `RollReviewPanel` Add roll appends with `manual`** (test, ~30 lines)
7. **T7.7 — Test: `RollReviewPanel` Skip calls `onSkip` and persists nothing** (test, ~25 lines)
8. **T7.8 — Test: `RollReviewPanel` warning chip for `validation_error` rows** (test, ~25 lines)
9. **T7.9 — `src/features/bjj/dashboard/components/RollReviewPanel.tsx`** (feat, ~120 lines)
   - Per-row editor: Role select, Outcome select, position_from select (from `useBJJPositions`), position_to select, technique multi-select, delete IconButton, confidence badge, warning chip; action bar: Confirm all / Save edits / Add roll manually / Skip for now
10. **T7.10 — Update `src/features/bjj/components/BJJSectionEditor.tsx`** (feat, ~25 lines)
    - Extend `AIPreview` interface with `rolls: BJJRollProposal[]`; store `result.rolls` in enhance onSuccess; render `<RollReviewPanel rolls={preview.rolls} sectionId={section.id} onConfirm={confirmRolls} onSkip={closePreview} onAddManual={appendManual} />` below `<AIPreviewPanel />`; wire `useConfirmRolls` to fire AFTER `useCreateBJJWorkout`/`useUpdateBJJWorkout` resolves
11. **T7.11 — Playwright: roll review confirm → dashboard updates** (test, ~40 lines)
    - File: `e2e/bjj-dashboard.roll-review.spec.ts`
    - Seed section + AI response with 3 rolls; open section editor; click Confirm all; navigate to `/bjj/dashboard`; assert role balance count = 3

#### Commit plan

- **c1:** `test(hooks): assert useConfirmRolls upsert payload and invalidation keys` — T7.1
- **c2:** `feat(hooks): add useConfirmRolls mutation with technique-name resolution and pre-step delete` — T7.2
- **c3:** `test(components): add RollReviewPanel interaction tests (confirm/edit/add/skip/validation-error)` — T7.3..T7.8
- **c4:** `feat(components): add RollReviewPanel with per-row editor and action bar` — T7.9
- **c5:** `feat(components): integrate RollReviewPanel into BJJSectionEditor with confirm-after-save wiring` — T7.10
- **c6:** `test(e2e): Playwright — roll review confirm flow updates dashboard count` — T7.11

#### PR checklist

- [ ] `npm run lint && npm test && npm run build` clean
- [ ] E2E: section save → roll confirm → dashboard re-fetch (verified in `e2e/bjj-dashboard.roll-review.spec.ts`)
- [ ] PR description links to REQ-RE8, REQ-RE10, REQ-PV4, REQ-PV7

---

## PR 8 — Phase F: Backfill banner

**Goal**: Informational banner shows count of sparring sections without confirmed roll data; clicking it links to section list (MVP: same dashboard reload).
**Depends on:** PR 7
**Forecast lines:** ~80
**Stacked-to-main:** yes
**Acceptance:**
- [ ] `useUnconfirmedSparringCount` hook + tests
- [ ] `bjj_unconfirmed_sparring_count` RPC migration extension (or single-purpose function)
- [ ] `DashboardBackfillBanner` renders above page header when `count > 0`; hidden on error
- [ ] "Don't show this again" persists to `localStorage['bjj-dashboard-banner-skip']`

#### Tasks

1. **T8.1 — Migration 6: `20260612000006_bjj_unconfirmed_sparring_count.sql`** (feat, ~30 lines)
   - `create or replace function bjj_unconfirmed_sparring_count() returns int security definer …` counting sparring sections (keyword heuristic) without confirmed rolls for `auth.uid()`
2. **T8.2 — Test: `useUnconfirmedSparringCount` calls RPC, returns 0 hidden, >0 visible** (test, ~25 lines)
3. **T8.3 — `src/features/bjj/dashboard/hooks/useUnconfirmedSparringCount.ts`** (feat, ~20 lines)
4. **T8.4 — `src/features/bjj/dashboard/components/DashboardBackfillBanner.tsx`** (feat, ~40 lines)
   - Uses `.banner` class; renders "N sparring sessions without confirmed roll data"; "Confirm in list" CTA (navigates to list of sections — for MVP, reload page with `?banner=1`); "Don't show again" persists to localStorage
5. **T8.5 — Update `BJJDashboardPage.tsx`: mount banner when `count > 0 && !skipped`** (feat, ~5 lines)

#### Commit plan

- **c1:** `feat(db): add bjj_unconfirmed_sparring_count SECURITY DEFINER RPC` — T8.1
- **c2:** `test(hooks): add useUnconfirmedSparringCount visibility tests` — T8.2
- **c3:** `feat(hooks): add useUnconfirmedSparringCount query with 60s staleTime` — T8.3
- **c4:** `feat(components): add DashboardBackfillBanner with skip-on-visit localStorage` — T8.4
- **c5:** `feat(dashboard): mount DashboardBackfillBanner above page header in BJJDashboardPage` — T8.5

#### PR checklist

- [ ] `npm run lint && npm test && npm run build` clean
- [ ] Banner hidden when count = 0; visible when count > 0; "Don't show again" works
- [ ] PR description links to REQ-RE9, REQ-BD1

---

## PR 9 — Phase G: Polish (E2E + a11y + bundle + perf + docs)

**Goal**: Verify NFRs and ship the change with full test coverage.
**Depends on:** PR 8
**Forecast lines:** ~150 (tests + docs dominant)
**Stacked-to-main:** yes
**Acceptance:**
- [ ] Playwright E2E covers: smoke, drill-down, time filter, banner, theme-shim absence
- [ ] axe-core scan: 0 critical violations on `/bjj/dashboard`
- [ ] `vite-bundle-visualizer`: dashboard chunk <200KB gzipped
- [ ] NFR-01 p95 < 2s measured with throttled Playwright
- [ ] ADR for MUI scoping + CHANGELOG entry

#### Tasks

1. **T9.1 — Playwright: full smoke + drill-down + time filter + banner + code-split** (test, ~120 lines)
   - File: `e2e/bjj-dashboard.spec.ts`
   - Cover all REQ-BD* and REQ-RE9 scenarios; assert no `aria-label="Toggle theme"` button exists
2. **T9.2 — Playwright + axe-core: a11y audit on `/bjj/dashboard`** (test, ~40 lines)
   - File: `e2e/a11y/bjj-dashboard.a11y.spec.ts`
   - `wcag2aa` tag; assert 0 critical violations; manual assertion for chart segment text labels
3. **T9.3 — Playwright perf: NFR-01 p95 < 2s with throttled network** (test, ~30 lines)
   - Use `page.route` to throttle; 5 runs; assert median < 2s
4. **T9.4 — Bundle size check: dashboard chunk < 200KB gzipped** (chore, ~20 lines)
   - Add script to `package.json` (`npm run build:bundle-report`); assert in CI log
5. **T9.5 — ADR: MUI scoping + deferred theme context** (docs, ~80 lines)
   - File: `docs/adr/0007-bjj-dashboard-mui-scoping.md`
6. **T9.6 — CHANGELOG entry** (docs, ~20 lines)
7. **T9.7 — Run `sdd-verify` against all 3 specs** (verify, gate)
   - Asserts REQ-BD1..BD10, REQ-RE1..RE10, REQ-PV1..PV8 pass

#### Commit plan

- **c1:** `test(e2e): add full Playwright spec covering all REQ-BD* and REQ-RE9 scenarios` — T9.1
- **c2:** `test(a11y): add axe-core scan for /bjj/dashboard with wcag2aa tag` — T9.2
- **c3:** `test(perf): add Playwright throttled-network NFR-01 p95 < 2s test` — T9.3
- **c4:** `chore(bundle): add vite-bundle-visualizer script and 200KB gzipped budget check` — T9.4
- **c5:** `docs(adr): document MUI scoping decision and deferred theme-context-unified` — T9.5
- **c6:** `docs(changelog): add Iteration 8 BJJ Evolution Dashboard entry` — T9.6
- **c7:** `chore(sdd): run sdd-verify against all 3 specs` — T9.7

#### PR checklist

- [ ] `npm run lint && npm test && npm run test:e2e && npm run build` all clean
- [ ] axe-core: 0 critical violations
- [ ] Bundle: dashboard chunk < 200KB gzipped
- [ ] NFR-01 p95 < 2s verified
- [ ] PR description links to ALL spec REQs and the sdd-verify report

---

## Phase-level sequencing notes

### Stacked-to-main means sequential, no parallelism

Per the chain strategy, each PR merges to `main` in order. There is **no** parallel work from feature branches:

- **PR 1** → merge to `main`. Staging DB has the schema.
- **PR 2** → branch from `main` (now has schema). Merge to `main`. EF + Zod + backfill live on `main`.
- **PR 3** → branch from `main` (now has EF contract). Merge to `main`. UI scaffold lives on `main`.
- **PR 4** → branch from `main`. Merge to `main`. MUI deps + theme land.
- **PR 5** → branch from `main`. Merge to `main`. Route resolves; 1 widget works.
- **PR 6a** → branch from `main`. Merge. 2 widgets work.
- **PR 6b** → branch from `main`. Merge. All 5 widgets work.
- **PR 7** → branch from `main`. Merge. Roll review flow works.
- **PR 8** → branch from `main`. Merge. Banner shows.
- **PR 9** → branch from `main`. Merge. Change ships.

### Hard external dependencies

- **PR 1 must be deployed to staging before PR 2 starts** (EF tests + backfill migration need the schema). The orchestrator should pause between PR 1 and PR 2 to confirm staging deploy.
- **PR 4 needs `npm install` completed locally** before PR 5 (MUI deps).
- **PR 5 needs MUI deps + theme + scaffold** (PR 4) before route can mount.

### Recommended user review pause points (interactive + `ask-always`)

Per interactive mode, the orchestrator pauses after each PR for review. **Visual parity review is mandatory** for:

- **PR 5 (D1)**: after 1 widget renders, screenshot vs `template.html` header/filter/footer/grid baseline.
- **PR 6b (D2)**: after all 5 widgets render, full dashboard screenshot vs `template.html` (pixel-level).
- **PR 7 (E)**: after roll review integration, manual smoke: enhance a sparring section → confirm rolls → re-open dashboard → counts match.

**Skip detailed visual review for**: PR 1 (SQL only), PR 2 (EF + backfill — Deno tests suffice), PR 3 (scaffold — covered by unit tests), PR 4 (deps + theme — type tests + smoke), PR 8 (banner — copy is the only UI surface), PR 9 (verify gate).

---

## Per-PR review budget guard (re-stated)

**400-line limit per PR** (additions + deletions).

| PR | Forecast | Margin | Action |
|----|----------|--------|--------|
| 1 | ~300 | OK | Single PR (SQL only) |
| 2 | ~250 | OK | Single PR |
| 3 | ~250 | OK | Single PR |
| 4 | ~150 | OK | Single PR |
| 5 | ~350 | OK | Single PR (commits ≤400 each) |
| 6a | ~250 | OK | Split from original D2 forecast |
| 6b | ~350 | OK | Split from original D2 forecast |
| 7 | ~250 | OK | Single PR |
| 8 | ~80 | OK | Single PR |
| 9 | ~150 | OK | Single PR |

> **Note**: The design forecast PR 6 (Phase D2) at ~450 lines. **D2 has been split into 6a (~250) and 6b (~350)** to honor the 400-line budget. Each sub-PR has clear scope and autonomous verification.

---

## Verification gates (machine-runnable)

### Per-PR gate (all 9 PRs)

```bash
npm run lint && npm test && npm run build
```

- `npm run lint` → `eslint .` (no errors, no warnings on new code)
- `npm test` → `vitest` (all new + existing tests green)
- `npm run build` → `tsc -b tsconfig.app.json tsconfig.node.json && vite build` (no type errors, no build errors)

### Per-Phase-B gate (PR 2)

```bash
# Deno tests for EF contract
cd supabase/functions/bjj-section-ai
deno test --allow-net --allow-env __tests__/
```

> **Architecture limitation** (from `engram_mem_context`): Deno tests use the module-graph-mock pattern and **cannot run in the current Deno harness**. The Deno tests will be exercised manually on staging with `supabase functions serve bjj-section-ai --env-file .env.local`. **Mitigation per design §14**: extract the Zod parsing of the LLM response into a pure function (T2.1 + T2.2) tested in Vitest so the contract is covered by Vitest.

### Per-Phase-D gate (PR 5, 6a, 6b)

```bash
npm run test:e2e -- bjj-dashboard
```

- Playwright smoke + drill-down + time filter + banner scenarios
- Visual parity check: `dashboard-screenshot.png` vs `open-design/.../template.html` (manual review on PR 5 and 6b)

### Per-Phase-B-EF (PR 2): Vitest covers Zod parse

```bash
npm test -- bjj.schema useBJJSectionAI
```

### End-of-change gate (PR 9)

```bash
# All 3 specs verified
openspec verify bjj-evolution-dashboard
```

Asserts all 10 REQ-BD*, 10 REQ-RE*, 8 REQ-PV* scenarios pass.

---

## Out-of-scope: `theme-context-unified` follow-up

This change ships the **seam** for the deferred unified theme context. Specifically:

- `src/features/bjj/dashboard/theme/useDashboardColorScheme.ts` (PR 3, T3.19) — the hook's body is the only call site that changes when the follow-up lands.
- The `useDashboardColorScheme` file ships with a **comment** explaining it's the seam:
  ```ts
  /**
   * SEAM: This hook's body is the single call site that `theme-context-unified`
   * replaces. The follow-up swaps `matchMedia` for `useContext(ThemeContext)`.
   * See docs/adr/0007-bjj-dashboard-mui-scoping.md.
   */
  ```
- `mui-dashboard-theme.ts` reads `mode` from this hook's return value — no change needed.
- `BJJDashboardPage` calls `useDashboardColorScheme()` and passes the result to `createDashboardTheme(mode)` — no change needed.

**This change does NOT scope**:
- `src/theme/ThemeContext.tsx` (new file)
- `<ThemeContextProvider>` wrapping `<App />` in `src/main.tsx`
- `<IconButton>` sun/moon/system toggle in `AppShell` header
- `localStorage['theme']` persistence
- `<html class="dark">` write from the context
- Cross-route MUI/Tailwind sync tests

---

## Risk register for execution

1. **`bjj-section-ai` EF tests can't run in current Deno harness** (architecture limitation).
   - **Mitigation**: extract Zod parsing of the LLM response into a pure function (T2.1 + T2.2) tested in Vitest. Deno tests are deferred to staging manual run.
2. **MUI deps add ~150KB gzipped to the dashboard route**.
   - **Mitigation**: verify `React.lazy` + `vite.config.ts` `optimizeDeps.include` actually splits; assert dashboard chunk < 200KB gzipped in PR 9 (T9.4). If chunk exceeds, defer `@mui/x-charts` (already declared, unused).
3. **Backfill migration touches existing data**.
   - **Mitigation**: run on staging DB first; commit includes a manual verification step (T1.9-style test in PR 2). Banner UX ensures no auto-confirm; idempotent `ON CONFLICT DO NOTHING`.
4. **`proposed` rows from backfill pollute the dashboard if not filtered**.
   - **Mitigation**: PR 1 includes RPC-level test T1.6 asserting `proposed` rows are excluded from all aggregates (role_balance, outcomes, position_transitions, last_techniques, technique_types).
5. **400-line budget on original PR 6 (D2) at ~450 lines**.
   - **Mitigation**: split D2 into 6a (~250) and 6b (~350) — final count 9 PRs.

---

## Cross-cutting references

- **Test convention**: every new file ships a `__tests__/{Name}.test.ts(x)` sibling or `.test.ts` co-located. RED (failing test) → GREEN (minimum pass) → REFACTOR.
- **Commit convention**: `work-unit-commits` skill is canonical. Conventional commits: `feat`, `test`, `chore`, `refactor`, `fix`, `docs`. No `Co-Authored-By`.
- **CSS isolation**: `src/features/bjj/dashboard/` is a **Tailwind-utility-free zone**. Only `.widget`, `.tech-row`, etc. + `clsx`.
- **localStorage keys**: `bjj-dashboard-window` (filter), `bjj-dashboard-banner-skip` (banner). **No `theme` key** in this change.
- **Out-of-scope mark**: every file ships without TODO/FIXME unless linked to an issue.
- **End-of-change**: `sdd-verify` against all 3 specs (`bjj-dashboard`, `bjj-roll-events`, `bjj-position-vocabulary`).
