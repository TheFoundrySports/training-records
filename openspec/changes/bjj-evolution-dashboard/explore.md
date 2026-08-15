# Exploration: BJJ Evolution Dashboard (Iteration 8)

> Source PRD: `docs/prd-bjj-dashboard.md` v0.3
> Open Design artifact: `open-design/5e17c655-dae0-443c-b191-c1967d177f4b/.live-artifacts/bjj-evolution-dashboard/`
> Scope: pure investigation. No code changes. No proposal/spec/design/tasks.

---

## 1. Reuse surface — what already exists

### 1.1 `bjj-section-ai` Edge Function

- **Path:** `supabase/functions/bjj-section-ai/index.ts` (328 lines) + `prompt.ts` (59 lines) + Deno tests under `__tests__/`.
- **Current request:** `{ section_goal: string (required), raw_description: string }` — validated at line 220–230 of `index.ts`. 400 if `section_goal` is empty.
- **Current response shape** (interface at line 24–27):
  ```ts
  interface BJJSectionAIResponse {
    ai_description: string
    matched_technique_ids: string[]
  }
  ```
- **Client consumer:** `src/features/bjj/hooks/useBJJSectionAI.ts` (46 lines) — TanStack `useMutation` calling `supabase.functions.invoke`. Return type is the same `BJJSectionAIResult` interface.
- **Where to extend with `rolls[]`:** Per PRD §6.8.2 the new field is appended to the response:
  ```ts
  rolls: Array<{
    roll_index: number
    role: 'attacking' | 'defending' | 'neutral'
    outcome: 'submission' | 'position_gain' | 'position_loss' | 'neutral'
    position_from: string
    position_to: string | null
    technique_names: string[]
    confidence: number  // 0..1
    raw_excerpt: string
  }>
  ```
  The function is **not** the place to persist rolls — it proposes them, the client (or a downstream Edge Function) persists after the user confirms via `RollReviewPanel`. Existing mock fallback at `index.ts:150` (`buildMockResponse`) must also produce `rolls: []` to keep the contract safe.
- **Auth + service-role pattern:** Already established (`index.ts:198–215`). New role/outcome/position vocabulary validation can sit alongside `isValidAIResponse` at line 161.
- **Tests:** `__tests__/index.test.ts` (Deno integration tests against a served function) and `__tests__/build_system_prompt.test.ts` (pure prompt builder). The integration test pattern (REQ-402 etc.) is reusable for new contract tests.

### 1.2 `BJJSectionEditor` + AI enhance flow

- **Path:** `src/features/bjj/components/BJJSectionEditor.tsx` (246 lines) — the per-section card in the BJJ workout form.
- **AI enhance flow:** `useBJJSectionAI().enhance` (line 38) → `setPreview(result)` (line 61) → renders `<AIPreviewPanel preview={...} />` (line 190). `AIPreviewPanel` (`src/features/bjj/components/AIPreviewPanel.tsx`, 60 lines) only shows `ai_description` + matched technique IDs and provides Apply/Discard.
- **Where `RollReviewPanel` slots in:** PRD §6.8.3 says "inline in `BJJSectionEditor` or modal overlay before section save is finalized". The natural slot is the existing AI preview region (lines 189–195), extended to: when `preview.rolls?.length > 0`, render `<RollReviewPanel />` below `<AIPreviewPanel />` and gate the existing Apply/Discard flow until rolls are confirmed/skipped. The `AIPreview` interface in `BJJSectionEditor.tsx` (line 13) must grow to include `rolls`.
- **Local state pattern:** `useState<AIPreview | null>(null)` with `useRef` `enhanceInFlightRef` for re-entrancy guard — same shape works for tracking `proposedRolls` separately.
- **Section save is unchanged:** roll persist is a **separate** post-save step, not part of `bjj_create_workout` RPC. This keeps the existing `useCreateBJJWorkout` / `useUpdateBJJWorkout` mutations untouched.

### 1.3 Iteration 7 — Technique tracking (last-techniques + technique-type widgets)

- **`technique_practice_log` table:** Defined in `supabase/migrations/20260514000001_technique_practice_log.sql`. Schema: `(id, user_id, technique_id, total_practices, first_practiced_at, last_practiced_at, created_at, updated_at)` with unique `(user_id, technique_id)`. Auto-upserted via trigger on `bjj_section_techniques` INSERT.
- **Reading pattern for last-techniques widget (PRD §6.3):** This is exactly the query `useTechniqueLearningStatus` (`src/features/bjj/progression/hooks/useTechniqueLearningStatus.ts`, 38 lines) does — but it reads the joined view `technique_learning_status` (migration `20260514000003`). The dashboard needs a *separate* hook with a different shape and order (`last_practiced_at DESC LIMIT 10`, not learning status). Mirror the queryClient/Query pattern; do not reuse the hook verbatim.
- **Technique-type widget data source (PRD §6.4):** `bjj_section_techniques` → `bjj_techniques.category`. No existing aggregation hook — needs a new one (likely a Postgres view per PRD §6.9, or a Supabase RPC). PRD §8.3 splits the client into `useBJJDashboardSummary(window)` plus per-widget hooks — a single RPC returning the whole `BJJDashboardData` payload (PRD §6.11) is the simpler MVP path.
- **Existing consumers of `bjj_section_techniques`:** `useBJJWorkoutMutations` (RPC `bjj_create_workout`), `useUpdateBJJWorkout` (RPC `bjj_update_workout`), `useBJJSections` (read with nested `bjj_techniques` select), `TechniquePracticeModal` (history join). All read paths use Supabase PostgREST nested selects — new views should follow the same style.
- **`TechniquePracticeModal`:** `src/features/bjj/progression/components/TechniquePracticeModal.tsx` (189 lines). Reuses shadcn `Dialog` + `Card`. Already opens by `(techniqueId, techniqueName)` — the PRD §6.3 row-click interaction is a clean drop-in (modal already exists; new widget just needs `onClick` wiring).
- **No `useTechniqueLearningStatus`-like shared hook for last-techniques:** confirms we must build a new hook, but the pattern (TanStack `useQuery` + `staleTime: 60_000` + `enabled: Boolean(userId)`) is the right template.

### 1.4 Iteration 6 — Blue Belt progression & category labels

- **Path:** `src/features/bjj/progression/`. The Spanish category label map lives inline in `ProgressionSection.tsx` lines 171–177:
  ```ts
  const categoryLabels: Record<string, string> = {
    takedown: 'Comienzo de la lucha',
    guard_pass: 'Pasados',
    guard: 'Guardia',
    submission: 'Sumisiones',
    escape: 'Escapes y salidas',
  }
  ```
  This is **Spanish-only**, hard-coded, in-file. It does not include `transition` or `other` (no fallback mapping either).
- **PRD §13.2 says:** "extract to shared `category-labels.ts` (supersedes `ProgressionSection.tsx` labels where they differ)". Canonical English labels per PRD §6.4:
  ```ts
  {
    guard_pass: 'Guard passes',
    submission: 'Submissions',
    escape: 'Escapes',
    guard: 'Guard',
    takedown: 'Takedowns',
    transition: 'Transitions',
    other: 'Other',
  }
  ```
  **Implication:** the shared map needs **both** locales (or a structured `Record<locale, …>`), so the Spanish page still works while the dashboard uses English. PRD §9 explicitly calls out "Spanish/English label inconsistency" as a Low risk and "separate `category-labels` maps if needed". The proposal phase should pick a structure (single canonical English source + a `t()` helper, vs. two separate maps) — see Open Question #4.
- **Other category-color tokens** live in `template.html` (lines 70–84 light, 107–120 dark), e.g. `--cat-takedown: #d97706`. These are **English-context tokens**, separate from the Spanish blue-belt page. No existing app code uses these tokens — they must be authored fresh.
- **The PRD's category list (English canonical):** PRD §6.4 lists 7 categories, including `guard_pass` and `transition`. The existing BJJ migration `20260415000002_create_bjj_tables.sql` (line 8) and `20260426000001_bjj_add_guard_pass_category.sql` already cover all 7. The Zod enum in `src/features/bjj/bjj.schema.ts` (lines 4–12) also lists all 7. **No schema change needed for category values — only the shared label map.**

### 1.5 Routing & AppShell

- **Router:** `src/app/router.tsx` (148 lines) — `createBrowserRouter`. BJJ routes currently:
  - `/bjj/new` (BJJWorkoutFormPage)
  - `/bjj/:id/edit` (BJJWorkoutFormPage)
  - `/bjj/blue-belt-progression` (BeltProgressionPage)
- **Where to add `/bjj/dashboard`:** Insert between the edit and blue-belt routes, inside the `AppShell` children block (so it gets the `Outlet`/layout but no admin gate):
  ```ts
  { path: 'bjj/dashboard', element: <BJJDashboardPage /> }
  ```
- **`AppShell` nav:** `src/app/AppShell.tsx`. Two nav surfaces to update:
  - **Desktop nav** (lines 36–66): hardcoded `<Link>`s — add "BJJ Dashboard" before "Blue Belt".
  - **Mobile nav** (lines 11–17): `NAV_ITEMS` array — add the same entry.
  - The PRD is explicit (NG1, §6.10.6) that the dashboard uses MUI, but the **AppShell stays shadcn/Tailwind**; the MUI route only renders inside `<Outlet />`. No replacement of the shell.
- **Route protection:** Already wrapped in `<ProtectedRoute />` at line 41. New route inherits auth — no extra guard.

### 1.6 Theme system (dark/light)

- **Existing setup:** Tailwind v4 + shadcn `index.css` defines `:root` (light) and `.dark` selectors (lines 8–132). `color-scheme: light dark` and `@custom-variant dark (&:is(.dark *))` mean Tailwind v4 dark mode is gated by the `.dark` class on `<html>`. No `ThemeContext`, no `useTheme` hook — the only existing toggle is implicit via the `color-scheme` CSS.
- **shadcn v4 dark class:** `@custom-variant dark (&:is(.dark *))` (line 6) — requires a `.dark` ancestor for shadcn dark utilities to work.
- **No MUI dependency in `package.json`** — adding MUI is a fresh install. The PRD §6.10.6 scopes MUI to `/bjj/dashboard` only.
- **No React-Bits dependency either** — PRD §6.13 says copy-paste components into `src/components/react-bits/` via shadcn/jsrepo CLI. No npm install needed.
- **No `src/theme/` directory exists** — must be created.
- **Implication:** The PRD's `ThemeContext` (light/dark/system with localStorage `theme` key) is **brand new infrastructure**, not an extension. The proposal phase should decide whether to (a) build a tiny `useTheme()` that toggles `document.documentElement.classList` + `localStorage` and accepts light/dark/system, and (b) add a single toggle in `AppShell` header (or defer to a separate PR). See Open Question #3.

### 1.7 Data layer pattern

- **Supabase client:** `src/lib/supabase.ts` (13 lines) — single anon-key client.
- **Edge Function invocation:** two patterns coexist:
  - `supabase.functions.invoke` (used by `useBJJSectionAI`) — simpler, but error wrapping on non-2xx is generic.
  - `invokeFunction` helper in `src/lib/edge-function.ts` (44 lines) — fetch-based, preserves `{ error: { code, message, details } }` shape from Edge Functions. **Prefer the helper** for the new dashboard RPC/Edge Function (per §6.11) so error contracts stay explicit.
- **TanStack Query setup:** `src/lib/queryClient.ts` (10 lines) — `staleTime: 5min`, `retry: 1`. Existing hooks consistently use these defaults plus local `staleTime` overrides (e.g. `useTechniqueLearningStatus` uses `60_000`).
- **Postgres RPC pattern:** `bjj_create_workout` and `bjj_update_workout` are `security definer` functions in `supabase/migrations/20260415000003_…` and `20260519000002_…`. Custom input types (`bjj_section_input`) live in the same migration. The dashboard should follow the same pattern: one or more RPCs (e.g. `bjj_dashboard_data(p_window text, p_start date, p_end date)`) returning a typed JSON. The PRD §8.3 hints at four hooks but a single RPC is simpler.
- **No existing aggregation/RPCs for analytics** — the only read-heavy aggregation today is `technique_learning_status` (a SQL view). Dashboard follows the same "view + hook" recipe.

### 1.8 RLS pattern to mirror

- The cleanest mirror for the new `bjj_roll_events` table is **`bjj_section_techniques`** (migration `20260415000002` lines 106–137): owner check via a 2-table join (`bjj_sections → workouts → auth.uid()`). Same applies to `bjj_roll_events` because it has a `section_id` FK. Pattern:
  ```sql
  create policy "Users can read own bjj_roll_events"
    on public.bjj_roll_events for select
    using (exists (
      select 1 from public.bjj_sections s
      join public.workouts w on w.id = s.workout_id
      where s.id = section_id and w.user_id = auth.uid()
    ));
  ```
  Plus insert/update/delete with the same `with check` shape. No coach read in MVP (deferred to 8.1 per PRD §6.9).

### 1.9 Backfill precedent (one-off script)

- `supabase/migrations/20260514000004_backfill_practice_log.sql` (28 lines) is the existing pattern: a single `INSERT … SELECT … GROUP BY …` with `ON CONFLICT DO NOTHING`, idempotent. Roll backfill could either reuse this approach (one-shot migration that proposes rows for any sparring sections lacking roll events) **or** use a new Edge Function (PRD §6.9 last bullet suggests either). The migration path is consistent with the project's "no separate admin scripts" stance; the Edge Function path lets the user trigger per-user with a "X sparring sessions without confirmed roll data" banner (PRD §6.8.4). See Open Question #2.

---

## 2. Greenfield surface — what must be created

### 2.1 Database

- **New table `bjj_roll_events`** with 4 enums (`bjj_roll_role`, `bjj_roll_outcome`, `bjj_roll_event_status`, `bjj_roll_event_source`). Full DDL in PRD §6.9 (lines 456–487). Includes 3 indexes and a unique `(section_id, roll_index)` constraint.
- **3 new SQL views** (`bjj_dashboard_role_balance`, `bjj_dashboard_outcomes`, `bjj_dashboard_position_transitions`) per PRD §6.9 lines 491–527 — all join `workouts` and filter `type = 'bjj' AND status = 'confirmed'`.
- **Optional RPC `bjj_dashboard_data(p_window, p_start, p_end)`** wrapping the views and adding the technique aggregations (last techniques + technique types) into a single response matching `BJJDashboardData` (PRD §6.11). Or: separate reads from the client against views + `technique_practice_log` + a technique-types view. PRD leaves this open; see Open Question #1.
- **Migration tooling:** `supabase/migrations/` (37 timestamped files). New entries follow the pattern `20260612000001_bjj_roll_events.sql` etc. Migrations are applied via `supabase db push`; no separate migration CLI in this repo.
- **Historical backfill:** new migration or Edge Function per §6.9 last bullet (see §1.9 above).

### 2.2 Edge Functions / RPCs

- **Extend `bjj-section-ai` response** to include `rolls[]` (see §1.1). Update `BJJSectionAIResponse` interface, the system prompt, and the `isValidAIResponse` guard. Add Deno tests in `__tests__/index.test.ts` and a new `__tests__/parse_rolls.test.ts` for the parser.
- **New dashboard RPC or Edge Function** for `BJJDashboardData` aggregation. Naming convention from existing RPCs: `bjj_dashboard_data`. If implemented as an Edge Function, register in `supabase/functions/`.
- **No new auth / config tables** — `ai_settings` is reused if we add AI-driven roll extraction (no change needed for the prompt extension).

### 2.3 Feature folder structure (per PRD §8.1)

```
src/features/bjj/dashboard/
├── pages/
│   └── BJJDashboardPage.tsx
├── components/
│   ├── LastTechniquesWidget.tsx
│   ├── TechniqueTypeWidget.tsx
│   ├── RoleBalanceWidget.tsx
│   ├── OutcomesWidget.tsx
│   ├── RollFlowWidget.tsx
│   ├── DashboardTimeFilter.tsx
│   ├── DashboardPageHeader.tsx
│   └── DashboardEmptyState.tsx
├── hooks/
│   └── useBJJDashboard.ts
├── types/
│   └── dashboard.types.ts
└── theme/
    ├── material-tokens.ts
    ├── material-dashboard.css
    └── mui-dashboard-theme.ts

src/theme/
└── ThemeContext.tsx

src/components/react-bits/
├── CountUp.tsx
├── FadeContent.tsx
└── AnimatedContent.tsx
```

- **New `src/features/bjj/category-labels.ts`** (or `src/features/bjj/utils/category-labels.ts`) shared by dashboard (English) and progression page (Spanish). See §1.4 and Open Question #4.
- **New `src/features/bjj/dashboard/components/RollReviewPanel.tsx`** lives in the dashboard feature, not in `bjj/components/`, because it consumes dashboard types. But it's **used** by `BJJSectionEditor` (which is in `bjj/components/`), so a clean import direction is `bjj/dashboard/RollReviewPanel → used by bjj/components/BJJSectionEditor`. The proposal phase should confirm the dependency direction (no cycles if `RollReviewPanel` only imports hooks/types, not page components).
- **No new `src/components/form/` files** unless we add a date-picker for the post-MVP custom range (PRD §6.2 marks Custom as post-MVP).

### 2.4 Theme infrastructure

- **`src/theme/ThemeContext.tsx`** — new file. API per PRD §6.12:
  - Mode: `'light' | 'dark' | 'system'` (default `'system'`).
  - Toggles `class="dark"` on `<html>` for shadcn.
  - Provides `mode` for the dashboard's `ThemeProvider` to map to MUI `palette.mode`.
  - Persists to `localStorage` key `theme`.
  - On mount: reads `localStorage` + `prefers-color-scheme` listener.
- **`src/features/bjj/dashboard/theme/material-tokens.ts`** — typed export of every CSS variable from `template.html` lines 12–85 (light) and 88–122 (dark). Useful for both MUI theme construction and chart libraries that need hex values at runtime.
- **`src/features/bjj/dashboard/theme/material-dashboard.css`** — port of `template.html` lines 7–328. Used by the dashboard's page-level wrapper (or the page itself) so MUI components without theme coverage still match the artifact.
- **`src/features/bjj/dashboard/theme/mui-dashboard-theme.ts`** — `createTheme({ palette: { mode }, ...overrides })` consuming the tokens. The PRD §6.10.7 mapping table gives the per-pattern MUI component choice.

### 2.5 New npm dependencies

- `@mui/material`, `@emotion/react`, `@emotion/styled` (MUI peers — confirm versions; project uses React 19, so MUI v6 or v7).
- `@mui/x-charts` (optional, for the donut in §6.10.7).
- `@fontsource-variable/roboto`, `@fontsource-variable/roboto-mono` and a Google Sans substitute (or self-hosted woff2 in `public/`). Geist is the current global font via `@fontsource-variable/geist` (line 17 of `package.json`); the dashboard's `--font-display: "Google Sans", Roboto, Arial` is a new font import scoped to the route.
- **No React-Bits npm install** — copy-paste per PRD §6.13.
- The **Vite/Rolldown** build needs to be tested with MUI's tree-shakable imports; the project already follows the `optimizePackageImports: ['@mui/material']` convention (per the React best-practices skill references). Verify `vite.config.ts` does not need an explicit `optimizeDeps.include`.

### 2.6 New components inside `bjj/components/`

- **`RollReviewPanel.tsx`** — shadcn-based, English UI, edits per-row selects + multi-select for techniques, "Confirm all" / "Save edits" / "Add roll" / "Skip" actions. Edits state in-memory and emits a callback. NOT a TanStack mutation on its own — it batches into a single `bjj_roll_events` upsert on confirm.
- **No changes to `AIPreviewPanel.tsx`** for the first iteration; the panel can keep its current apply/discard flow for `ai_description` + `matched_technique_ids`, and the new `RollReviewPanel` renders below it when `rolls.length > 0`.

### 2.7 New TanStack Query hooks

- `useBJJDashboard(window)` — top-level (PRD §6.11) — returns `BJJDashboardData`.
- Optionally split into `useLastTechniques`, `useTechniqueTypes`, `useRoleBalance`, `useOutcomes`, `useRollFlow` for independent loading/error boundaries (PRD NFR-03 implies per-widget error boundary).
- `useConfirmRolls()` — mutation that upserts `bjj_roll_events` rows.

---

## 3. Open Design artifact

**Path:** `open-design/5e17c655-dae0-443c-b191-c1967d177f4b/.live-artifacts/bjj-evolution-dashboard/`

### 3.1 File inventory

| File | Bytes | Purpose |
|------|-------|---------|
| `artifact.json` | 324 | Slug + entry pointers |
| `provenance.json` | 1022 | Generation notes, sources, transformations |
| `data.json` | 6032 | Canonical dashboard data contract (mock) |
| `template.html` | 33774 | Material Design 3 HTML/CSS + widget markup |
| `index.html` | — (generated preview, do not edit) |

The `artifact.json` declares `pinned: true`, `format: "html_template_v1"`, with `dataPath: "data.json"`, `templatePath: "template.html"`, `generatedPreviewPath: "index.html"`. The full file exists in the path; the proposal phase can read it directly.

### 3.2 Non-obvious details from `template.html` and `data.json`

- **Sidenav/topbar deferred:** the `template.html` ships an `.appshell` with `.sidenav` (240px grid column) and `.topbar` (PRD §6.10.5 marks these as **Deferred**). Implementation must skip the `<aside class="sidenav">` and `<header class="topbar">` blocks; the React dashboard renders **only** the `.page` content into the existing `<Outlet />`.
- **Grid spans encoded as CSS classes:** `.widget.span-2`, `.span-3`, `.span-4`, `.span-6` (template lines 211–223) — component names in PRD §6.10.5 mirror this. A React `<DashboardWidget span={3}>` prop should map 1:1 to `className="widget span-3"`.
- **Donut math is precomputed in `data.json`:** the `technique_types.segments[]` already include `dasharray` and `dashoffset` (template line 470 uses `stroke-dasharray="{{seg.dasharray}}" stroke-dashoffset="{{seg.dashoffset}}"`). The C=2πr math (r=50) is already done by the artifact. **The React component should consume the precomputed values** — no client-side SVG math required. (PRD §6.4 confirms: "Donut SVG segments may be computed client-side from percentages." → can be re-derived if `data.json` ever drops the precomputed values.)
- **Dark mode via CSS only:** template uses `@media (prefers-color-scheme: dark)` (line 88) — **no JS toggle in the artifact**. PRD §6.12 wants a JS toggle that persists. The React `ThemeContext` must manually apply the dark CSS variables to `:root` (or to a scoped class) when the user selects `dark` or `system+prefers-dark`, replacing the artifact's media query with explicit class-based switching.
- **Color tokens live on `:root`, not on a `.theme` class.** The CSS Custom Properties design means MUI's `createTheme` must **mirror** the same hex values (since MUI doesn't read CSS variables by default for `palette` colors — it needs hex at theme-construction time). The `material-tokens.ts` file is the source of truth for both CSS-in-JS and MUI.
- **`color-mix(in oklab, …)` is used in the artifact** for tinting (template lines 24, 100, 101, 247–253, 533). This CSS function is well-supported in modern browsers but the proposal should confirm the project's `browserslist` target (Vite 8 default is `es2022` + evergreen). If any browser in the support matrix lacks it, pre-compute tints in `material-tokens.ts`.
- **Charts use SVG with stroke + dasharray, not `<canvas>` or Recharts.** The donut, flow bars, and stacked role bar are all divs/SVGs styled via CSS — no charting library strictly required. The PRD §6.10.7 mapping mentions `@mui/x-charts` as one option; the template proves SVG-only is feasible and avoids a new dep.
- **`data.json` uses Spanish category labels?** No — all category labels in `data.json` are **English** (e.g. `"category_label": "Submissions"`, `"Guard passes"`). This validates the PRD's English-only dashboard decision.
- **`data.json` field for "rolls" suffix in Outcomes:** template line 540 says `{{o.n}} rollos` (Spanish!) in the original HTML, but `data.json` line 207 says `n: 16` and PRD §6.6 says the suffix is `{n} rolls` (English). **The React component must use the English suffix from the PRD, not copy the Spanish literal from the template.** This is a non-obvious gotcha: the template's hardcoded "rollos" in `.outcome-tile .n` is leftover from an earlier draft; the canonical English copy lives in PRD §6.6 and `data.json` (which is already English).
- **Footer text:** `Live data · last updated {{data.generated_at}}` (template line 576) — `data.json` line 4 is `"Jun 11, 2026 · 2:32 PM"`. The English-locale date format is intentional and PRD §6.1 specifies it. React should format the server's `now()` to this English string in the client (or the server returns it pre-formatted — see Open Question #1).
- **Widget class names map directly to PRD §6.10.5 component table.** Use this table as a 1:1 reference; do not invent new class names.
- **The `RollFlowWidget`'s `edges[].pct` is "relative to max edge in set (100 = widest bar)"** (PRD §6.11 comment on the type). This is **not** a percentage of total — it scales the bar widths so the most-common transition is full-width. Implementation must respect this normalization to match the visual.

---

## 4. Integration risks (factual)

### 4.1 MUI + Tailwind coexistence on the same route

- **Reality check:** The dashboard route is a single `<Outlet />` child of the shadcn `AppShell`. The page content can mount an MUI `ThemeProvider` that scopes MUI's CSS-in-JS to the dashboard subtree. shadcn/Tailwind classes on the rest of the page (header, footer, nav) are unaffected.
- **Risk surface:** Two CSS systems write to the same DOM. The known pain points:
  1. **Tailwind's preflight vs MUI's CssBaseline** — both reset margins/fonts. Mount MUI `ScopedCssBaseline` (available in v5+) or wrap the dashboard subtree to avoid global leakage.
  2. **Class collisions** — Tailwind v4 utility classes (`.grid`, `.text-sm`, etc.) may overlap with MUI emotion-generated class names. The MUI `disableGlobalClass` option, or scoping with a wrapper class, mitigates this.
  3. **`<style>` ordering** — Vite/Tailwind injects into `<head>`; MUI emotion appends to `<head>` at runtime. The order matters for CSS specificity. The proposal phase should decide between a CSS-modules approach (port to a single `.css` file per the PRD's `material-dashboard.css`) vs. MUI's runtime emotion. **The PRD §6.10.1 explicitly suggests the CSS port path** — this is the safer MVP.
- **No existing MUI infrastructure** in the repo (no `src/theme/`, no MUI imports). The proposal phase should greenlight MUI v6+ for React 19 compatibility (or whatever the current stable is at proposal time).

### 4.2 RLS for `bjj_roll_events`

- The 3-table join pattern (event → section → workout → user) used in `bjj_section_techniques` migration lines 106–137 is the right template. No coach/admin read in MVP — pure user-isolation. The unique `(section_id, roll_index)` constraint prevents double-inserts on re-enhance.
- **Risk:** The `proposed → confirmed` state transition. A "delete then insert" pattern is brittle (foreign-key cascades). The PRD §6.8.3 says "replace `status = 'proposed'` rows" on re-enhance — this is `UPDATE`, not delete. Migration must not use `ON DELETE CASCADE` on `bjj_sections` if confirmed rows should survive section deletion; current `bjj_sections` migration has `on delete cascade` on `workouts` (line 59), so the cascade chain is: workout delete → section delete → roll_events delete. That's **acceptable** — confirmed rolls tied to deleted workouts are no longer meaningful. But the proposal should call this out so the user can decide.

### 4.3 Historical backfill

- Precedent: `20260514000004_backfill_practice_log.sql` — single migration, idempotent, `INSERT ... ON CONFLICT DO NOTHING`. Pattern fits roll backfill if we accept that every existing sparring section is auto-proposed in one shot.
- **PRD §6.8.4** explicitly defers to a banner UX: "X sparring sessions without confirmed roll data" → user confirms per-section in `RollReviewPanel`. This requires per-row backfill state (not a bulk migration), pointing to a one-off **Edge Function** over a migration. The proposal phase should pick: migration (bulk, no UX) vs. Edge Function (per-user trigger, banner). See Open Question #2.

### 4.4 i18n

- **No i18n in the app today.** Confirmed by `grep` for `i18n|useTranslation|react-i18next|intl.formatMessage` → 0 matches. The blue belt page (`belt-progression-sections.ts`) is hardcoded Spanish; the rest of the app is English. **No i18n framework to extend or bypass.**
- The PRD §6.1 "Dashboard locale: all UI copy is English" is achievable by literal strings, not by a translation key. The `category-labels.ts` shared map (see §1.4) is the only piece of "localizable" code that needs attention; everything else (widget copy, page header) is English-only by spec.
- **Risk:** Mixing Spanish (existing `ProgressionSection.tsx`) and English (new dashboard) for the same domain words is a UX inconsistency. The proposal should not try to retroactively translate the blue belt page — it should make the category-label map a structured source of truth (e.g. `Record<Locale, Record<CategoryKey, string>>`) so the two surfaces are clearly separated.

### 4.5 Supabase PostgREST + large `technique_ids[]` array

- `bjj_roll_events.technique_ids` is `uuid[]` (PRD §6.9 line 471). PostgREST reads `uuid[]` as a JS array — fine for inserts. Reads require `.contains('technique_ids', [...])` for filter; not used by dashboard queries (which aggregate by `category` from joined techniques, not by `technique_ids` array contents). **No risk**, but the proposal should note that `position_to` is `text` (not an enum) and the vocabulary is enforced only client-side — there's nothing stopping a user from typing `position_from: 'knee_on_belly_pizza'`. A `CHECK (position_from IN (...))` constraint or a `bjj_position` enum is the right defense. Open Question #5.

### 4.6 Bundle size

- NFR-05 says: code-split MUI via `React.lazy` on `/bjj/dashboard`. Confirm the router pattern supports this — current routes are direct imports in `router.tsx`. The proposal phase should add a `React.lazy(() => import('.../BJJDashboardPage'))` wrapper and a `Suspense` boundary (probably a skeleton in the `<Outlet />`).

### 4.7 Test surface

- **Strict TDD** is active in the project config (`openspec/config.yaml` line 11). The change must be test-first:
  - Deno tests for `bjj-section-ai` response contract change.
  - Vitest unit tests for: aggregation utilities, position vocabulary map, category-label map, time-window resolver, `useBJJDashboard` query keys.
  - Playwright E2E for: empty state, default 30d, time filter switch, roll review confirm → dashboard count update, theme toggle syncs Tailwind + MUI.
  - Component tests for: `RollReviewPanel` interactions (edit, delete, skip, confirm).
- The existing Vitest setup (`src/features/bjj/__tests__/`) is the right home. The existing Deno tests (`supabase/functions/bjj-section-ai/__tests__/`) are the right home for Edge Function tests.

---

## 5. Open questions for the user

1. **Aggregation path: one big RPC vs. multiple views + client composition.** PRD §8.3 lists 4 hooks (`useBJJDashboardSummary`, `useRoleBalance`, `useOutcomes`, `useRollFlow`). PRD §6.11 says "Edge Function or Supabase RPC" should return the full `BJJDashboardData`. Pick one: a single `bjj_dashboard_data(text window, date start, date end)` RPC returning the full object (simpler, fewer round trips, harder to per-widget error-boundary), OR three views + a technique aggregation RPC (per-widget loading, more flexible for future window presets). What's the right trade-off for MVP?

2. **Backfill UX: bulk migration vs. per-section banner.** PRD §6.9 says "one-time Edge Function or script"; PRD §6.8.4 says show a banner on dashboard visit listing "X sparring sessions without confirmed roll data". A bulk migration proposes everything at once (one `INSERT … ON CONFLICT DO NOTHING` like `20260514000004_backfill_practice_log.sql`); an Edge Function + banner lets the user opt-in per section in `RollReviewPanel`. Which fits the "in-a-hurry" US-49 persona better — silent bulk or explicit per-section review?

3. **Theme toggle scope: dashboard-only, app-wide, or split PR?** The `ThemeContext` (PRD §6.12) is shared infrastructure but the visible toggle lives in `AppShell` header (used by every route, not just the dashboard). If we ship the toggle in Iteration 8, every non-dashboard route gains a dark/light switch — that may be out of scope for an Iteration 8 PR focused on the dashboard. Should the toggle land in this PR (touches every route), ship dashboard-only with a deferred toggle, or be a separate infra PR?

4. **MUI's footprint: just dashboard route, or also a thin `AppShell` bridge?** The PRD §6.10.6 says MUI is dashboard-only. But MUI needs `CssBaseline` and a `ThemeProvider` mount. If we mount MUI only inside the dashboard page, dark mode for shadcn surfaces must be driven by the same `ThemeContext` writing to `document.documentElement.classList`. Two coordinated writes from the same hook. Is the user OK with the dashboard route being the only place with the MUI `ThemeProvider`, with the rest of the app following the shadcn `class="dark"` pattern? (It's what the PRD says, but worth confirming because the alternative — full MUI shell — was explicitly rejected as post-MVP.)

5. **Position vocabulary enforcement.** PRD §6.7 lists 11 canonical keys (free-text column on `bjj_roll_events.position_from`/`position_to`). Options: (a) leave as `text` and enforce only in the form/AI prompt (current PRD spec), (b) add a `bjj_position` enum or `CHECK` constraint, (c) add a `bjj_positions` lookup table. Option (a) is fastest and most flexible for the AI; (b)/(c) give the DB a backstop against bad data. Which is preferred for MVP?

6. **`Category-labels` map: structured bilingual source or two flat files?** The blue-belt page is Spanish; the dashboard is English; both label the same 7 category keys. Options: (a) one TypeScript `Record<'en' | 'es', Record<BJJCategory, string>>` with a `categoryLabel(category, locale)` helper, (b) two separate constants in different files. (a) keeps the labels in sync and gives the dashboard's future i18n a foundation; (b) is the minimum change. Which fits the project conventions?

---

## Result contract

- **status**: `ok` — all sections of the request were investigated. No blockers. The PRD and Open Design artifact are consistent and unambiguous on layout, data shape, scope, and risks.
- **artifacts**:
  - `openspec/changes/bjj-evolution-dashboard/explore.md` (this file, on disk)
  - Engram observation with `topic_key: sdd/bjj-evolution-dashboard/explore`, `type: architecture`, `capture_prompt: false`
- **key_reuse_points**:
  - `supabase/functions/bjj-section-ai/index.ts` (extend `BJJSectionAIResponse` with `rolls[]`)
  - `src/features/bjj/hooks/useBJJSectionAI.ts` (mirror the typed return)
  - `src/features/bjj/components/BJJSectionEditor.tsx` (`AIPreview` interface lines 13–16 → add `rolls`; preview state shape at line 33)
  - `src/features/bjj/components/AIPreviewPanel.tsx` (existing AI preview; renders below the new `RollReviewPanel`)
  - `src/features/bjj/progression/components/TechniquePracticeModal.tsx` (drill-down target for `LastTechniquesWidget`)
  - `src/features/bjj/progression/hooks/useTechniqueLearningStatus.ts` (pattern template for new `useLastTechniques`)
  - `src/features/bjj/progression/components/ProgressionSection.tsx` lines 171–177 (Spanish category labels → supersede with shared `category-labels.ts`)
  - `src/features/bjj/bjj.schema.ts` (BJJ_CATEGORIES + types — already covers all 7 categories)
  - `src/app/router.tsx` (insert `/bjj/dashboard` route inside `AppShell` children)
  - `src/app/AppShell.tsx` (add `BJJ Dashboard` to `NAV_ITEMS` array lines 11–17 and desktop nav lines 36–66)
  - `src/lib/edge-function.ts` (use `invokeFunction<T>()` for the new dashboard RPC/Edge Function)
  - `src/lib/queryClient.ts` (default `staleTime: 5min`; override per hook as needed)
  - `src/lib/supabase.ts` (single anon client — no changes)
  - `supabase/migrations/20260415000002_create_bjj_tables.sql` (RLS pattern via section → workout join — mirror for `bjj_roll_events`)
  - `supabase/migrations/20260514000004_backfill_practice_log.sql` (backfill precedent — idempotent `INSERT … ON CONFLICT DO NOTHING`)
  - `src/index.css` lines 100–132 (existing `.dark` selector — `ThemeContext` will toggle this class)
  - `open-design/5e17c655-dae0-443c-b191-c1967d177f4b/.live-artifacts/bjj-evolution-dashboard/{template.html, data.json, provenance.json, artifact.json}` (design source of truth)
- **key_greenfield**:
  - `supabase/migrations/20260612000001_bjj_roll_events.sql` (table + 4 enums + 3 indexes + unique constraint + RLS)
  - `supabase/migrations/20260612000002_bjj_dashboard_views.sql` (3 SQL views)
  - `supabase/migrations/20260612000003_bjj_dashboard_rpc.sql` (optional single RPC, depending on Q1 answer)
  - `supabase/functions/bjj-section-ai/index.ts` edit (response shape + `isValidAIResponse` guard + mock fallback update)
  - `supabase/functions/bjj-section-ai/prompt.ts` edit (instruct LLM to extract rolls when section indicates sparring)
  - `supabase/functions/bjj-section-ai/__tests__/` (add `parse_rolls.test.ts` or extend `index.test.ts` with `rolls[]` contract)
  - `src/features/bjj/dashboard/` (entire feature folder per PRD §8.1)
  - `src/features/bjj/dashboard/components/RollReviewPanel.tsx` (consumed by `BJJSectionEditor`)
  - `src/features/bjj/dashboard/hooks/useBJJDashboard.ts` (top-level hook)
  - `src/features/bjj/dashboard/types/dashboard.types.ts` (mirrors `BJJDashboardData`)
  - `src/features/bjj/dashboard/theme/{material-tokens.ts, material-dashboard.css, mui-dashboard-theme.ts}`
  - `src/features/bjj/category-labels.ts` (or `utils/category-labels.ts`) — shared, structured map
  - `src/theme/ThemeContext.tsx`
  - `src/components/react-bits/{CountUp.tsx, FadeContent.tsx, AnimatedContent.tsx}` (copy-paste per PRD §6.13)
  - `package.json` additions: `@mui/material`, `@emotion/react`, `@emotion/styled`, `@mui/x-charts` (optional), `@fontsource-variable/roboto`, `@fontsource-variable/roboto-mono`
  - `openspec/changes/bjj-evolution-dashboard/{proposal.md, design.md, specs/, tasks.md, apply-progress.md, archive/}` (next phases)
- **risks** (factual only — mitigation is for the design phase):
  - MUI + Tailwind coexistence on the same route requires either `ScopedCssBaseline` or the `material-dashboard.css` port path (PRD §6.10.1 favors the latter); no existing MUI infra in repo to extend.
  - RLS for `bjj_roll_events` works via the section→workout join (mirror `bjj_section_techniques`); `ON DELETE CASCADE` chain deletes confirmed rolls when a workout is deleted (acceptable, but the proposal should call it out).
  - Historical backfill: choose bulk migration (one-shot) vs. Edge Function with banner (per-user opt-in) — both are precedented in this repo (`20260514000004` migration vs. existing Edge Function pattern).
  - No i18n framework in the app today — dashboard English copy is literal strings; the only cross-locale concern is the `category-labels` map (Spanish for blue-belt page, English for dashboard).
  - `position_from`/`position_to` are free `text` in PRD §6.9 — no DB-level vocabulary enforcement; bad data can land via AI. Mitigation: client-side select + server-side validation in the new RPC/mutation.
  - Bundle size from MUI requires `React.lazy` on the route + likely `optimizeDeps.include` in `vite.config.ts`.
  - Strict TDD is active — every task needs failing tests first.
- **open_questions_for_user**: 6 (see §5 above; user should pick at least 1, 2, 3, 5; 4 and 6 are nice-to-have).
- **next_recommended**: `sdd-propose`
- **skill_resolution**: `paths-injected` (sdd-explore, sdd-propose, sdd-design, sdd-spec, sdd-tasks, sdd-apply, sdd-verify, sdd-archive, sdd-init, sdd-onboard are all listed in `<available_skills>` and discoverable by the orchestrator for the next phases)
