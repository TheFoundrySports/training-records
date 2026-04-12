# Exploration: garmin-import-training-intelligence

## Current State

### Architecture Overview

The app is a React 19 SPA with Supabase as backend. All data access from the frontend goes through the Supabase JS client (`src/lib/supabase.ts`) using TanStack Query for server-state management. Edge Functions live in `supabase/functions/` and follow a consistent Deno pattern using `https://esm.sh/` for npm imports.

### Workout Feature Patterns

- **Data layer**: `useWorkouts` / `useWorkout` hooks in `src/features/workouts/hooks/` use TanStack Query with `queryKey: ['workouts']` and `queryKey: ['workouts', id]`.
- **Mutations**: `useCreateWorkout`, `useUpdateWorkout`, `useDeleteWorkout` in `useWorkoutMutations.ts` — all invalidate the `['workouts']` query on success.
- **Mapping**: `mapRow.ts` converts snake_case DB rows to camelCase TypeScript types. New Garmin fields must follow this pattern.
- **Types**: Defined in `workout.types.ts` (`Workout`, `CreateWorkoutInput`, `UpdateWorkoutInput`). These are hand-maintained (not auto-generated from Supabase).
- **Schema**: `workout.schema.ts` holds Zod schemas for form validation. The `workoutSchema` currently has no Garmin fields.
- **Detail page**: `WorkoutDetailPage.tsx` renders a `<Card>` with `<DetailRow>` components. There is no existing conditional section for Garmin data — it must be added.
- **Form page**: `WorkoutFormPage.tsx` serves both create and edit. It supports a "Load Workout" from public WODs, which is a good pattern reference for "link to planned workout".

### AI Feature Patterns

- `useGenerateWorkout.ts` uses `useMutation` calling `supabase.functions.invoke('ai-generate', { body: { prompt } })`.
- `ai-generate/index.ts` Edge Function: auth check → parse body → call OpenAI GPT-4o-mini → return structured JSON.
- **No Zod validation on the Edge Function response** — it trusts the JSON parse directly. The new `training-evaluation` function must add Zod validation.
- Currently uses `OPENAI_API_KEY` env var — the new function can reuse this or add `GEMINI_API_KEY`.

### Edge Function Patterns

All functions follow the same structure:

1. CORS preflight handling
2. Auth header check + `supabase.auth.getUser()` verification
3. Route/method dispatch
4. `errorResponse()` / `jsonResponse()` helpers
5. Deno.env for secrets
6. Imports via `https://esm.sh/`

**Important**: Edge Functions cannot import from `src/` — shared logic lives in `supabase/functions/_shared/`. Currently only `wod-schemas.ts` exists there.

### Database State

Current tables: `profiles`, `workouts`, `categories`, `equipment`, `exercises`, `public_wods`.

The `workouts` table has `payload jsonb` for extensible structured data. New Garmin metrics could theoretically go into `payload`, but the requirement for typed columns (avg_heart_rate, max_heart_rate, etc.) and the need for indexed/query-able metrics calls for a dedicated table.

### Supabase Storage

No Storage buckets are in use yet. The `.fit` upload will be the first use of Supabase Storage in this project.

---

## Affected Areas

### New: DB Migrations

- `supabase/migrations/20260410000001_create_garmin_activities.sql` — new table `garmin_activities`
- `supabase/migrations/20260410000002_create_training_evaluations.sql` — new table `training_evaluations`

### New: Edge Functions

- `supabase/functions/garmin-import/index.ts` — receives `.fit` file, parses it, stores in Storage + DB, triggers evaluation
- `supabase/functions/training-evaluation/index.ts` — calls LLM, stores structured result in `training_evaluations`

### New: React Feature Folder

- `src/features/garmin/` — `.fit` upload hook + form component
  - `hooks/useGarminImport.ts`
  - `hooks/useGarminActivity.ts`
  - `components/GarminUploadForm.tsx`
  - `garmin.types.ts`
  - `index.ts`

### Modified: Workout Feature

- `src/features/workouts/workout.types.ts` — add optional `garminActivityId?: string` to `Workout`
- `src/features/workouts/hooks/mapRow.ts` — map new FK column
- `src/features/workouts/pages/WorkoutDetailPage.tsx` — add training intelligence widgets section + AI evaluation card (conditional on garmin data)
- `src/features/workouts/pages/WorkoutFormPage.tsx` — add "link to Garmin import" flow (optional, MVP may omit)

### New: Training Intelligence Components

- `src/features/garmin/components/TrainingMetricsPanel.tsx` — 5–7 metric cards
- `src/features/garmin/components/AIEvaluationCard.tsx` — AI evaluation display + CTA
- `src/features/garmin/components/HRZoneBar.tsx` — stacked bar chart for HR zones

### Modified: Types

- `src/types/supabase.ts` — add `garmin_activities` and `training_evaluations` table types

### Modified: Router

- `src/app/router.tsx` — optionally add `/workouts/:id/import-garmin` route

---

## Gap Analysis

### What needs to be CREATED

| Item                                      | Type           | Notes                                     |
| ----------------------------------------- | -------------- | ----------------------------------------- |
| `garmin_activities` table                 | DB migration   | Stores parsed FIT metrics + FK to workout |
| `training_evaluations` table              | DB migration   | Stores LLM response per garmin activity   |
| Supabase Storage bucket `garmin-fits`     | Config         | Private bucket, RLS to owner              |
| `supabase/functions/garmin-import/`       | Edge Function  | Parse FIT, store file + metrics           |
| `supabase/functions/training-evaluation/` | Edge Function  | Call LLM, validate, store result          |
| `src/features/garmin/`                    | Feature folder | Upload + display hooks/components         |
| `TrainingMetricsPanel`                    | Component      | Metrics cards + HR zone bar               |
| `AIEvaluationCard`                        | Component      | AI eval display                           |
| `training-evaluation` Zod schema (shared) | Validation     | Both FE and Edge Function use it          |

### What needs to be MODIFIED

| Item                    | Change                                                       |
| ----------------------- | ------------------------------------------------------------ |
| `workouts` table        | Add nullable `garmin_activity_id uuid` FK column (migration) |
| `workout.types.ts`      | Add `garminActivityId?: string`                              |
| `mapRow.ts`             | Map `garmin_activity_id`                                     |
| `WorkoutDetailPage.tsx` | Conditional Garmin sections                                  |
| `src/types/supabase.ts` | Add new table types                                          |

### What ALREADY EXISTS and can be reused

| Item                                     | How it's reused              |
| ---------------------------------------- | ---------------------------- |
| `supabase.functions.invoke()` pattern    | For FE → Edge Function calls |
| `useMutation` pattern                    | For upload mutation          |
| `useQuery` with `enabled` guard          | For lazy-loading garmin data |
| `Card`, `Badge`, `Button` components     | All metrics UI               |
| `errorResponse` / `jsonResponse` helpers | Copy to new Edge Functions   |
| GPT-4o-mini via `OPENAI_API_KEY`         | Already in Edge Function env |

---

## Approaches

### Approach A: Monolithic `garmin-import` Edge Function

One Edge Function receives the `.fit` file, parses it, stores to Storage and DB, **and** calls the LLM — returning everything in one response.

- **Pros**: Simpler client flow (one `invoke` call), atomic
- **Cons**: Long execution time (parsing + LLM call ≥ 5s), risk of timeout (Supabase Edge Function limit is 150s but network latency stacks), harder to retry just the AI step
- **Effort**: Medium

### Approach B: Split Edge Functions (RECOMMENDED)

`garmin-import` handles FIT parsing + Storage + metrics DB insert. It returns a `garmin_activity_id`. The FE then polls or triggers `training-evaluation` separately as a second call.

- **Pros**: Each function is fast and focused, independent retry, AI eval can be shown async with a loading skeleton
- **Cons**: Two round-trips, slightly more complex client orchestration
- **Effort**: Medium-High
- **Why preferred**: The FIT parsing step is deterministic and fast; the LLM step is slow and expensive. Decoupling them lets the UI show metrics immediately while AI eval loads asynchronously. This also mirrors how the existing `ai-generate` function is called.

### Approach C: Background Queue via pg_net / pg_cron

`garmin-import` writes to DB, then triggers LLM evaluation via a Postgres background job.

- **Pros**: Truly fire-and-forget, resilient
- **Cons**: Requires pg_net extension setup, significantly more complex, overkill for MVP
- **Effort**: High

**Recommendation**: Approach B (Split Edge Functions)

---

### FIT Parsing Library Choice

| Library                 | Deno-compatible                       | Quality           | Notes                                     |
| ----------------------- | ------------------------------------- | ----------------- | ----------------------------------------- |
| `fit-file-parser` (npm) | Via `npm:fit-file-parser` or `esm.sh` | Good, widely used | Callback-based API, needs promisification |
| `@garmin/fitsdk`        | Unclear Deno support                  | Official          | Heavy, built for Node.js                  |
| `fit-parser` (npm)      | Via esm.sh                            | Simpler           | Less maintained                           |

**Recommendation**: `fit-file-parser` via `https://esm.sh/fit-file-parser` — it's the most widely used in the community, parses to plain JSON, and can be imported in Deno via esm.sh. The `ArrayBuffer` from the multipart form body can be converted to `Buffer` in Deno using `Uint8Array`.

**Risk**: `fit-file-parser` is callback-based. Must wrap in a Promise. Needs testing with real `.fit` files.

---

### LLM Model Choice

| Model            | Cost     | Speed     | Quality | Setup                                 |
| ---------------- | -------- | --------- | ------- | ------------------------------------- |
| GPT-4o-mini      | Low      | Fast      | Good    | Already configured (`OPENAI_API_KEY`) |
| Gemini Flash 2.0 | Very low | Very fast | Good    | Needs `GEMINI_API_KEY`                |

**Recommendation**: GPT-4o-mini as default (env var already in use), with `GEMINI_API_KEY` as an optional alternative. This avoids requiring a new secret for MVP.

---

### HR Zone Distribution

Calculating HR zone distribution requires knowing the athlete's max HR (typically 220 - age). This data is not in the system yet.

Options:

1. **Hardcode zones** using standard Garmin 5-zone model with default max HR = 190 — simplest for MVP
2. **Derive from FIT file** — Garmin devices often encode HR zones in the FIT file itself
3. **Athlete profile** — add `max_hr` to `profiles` table

**Recommendation**: Option 2 first (read zones from FIT), fall back to Option 1 if not present. Defer Option 3 to a future iteration.

---

### Workout Linking Logic

Two scenarios:

1. **Import → Link**: Athlete uploads FIT, then optionally links it to an existing planned workout.
2. **Standalone**: FIT import creates a new workout record automatically (using FIT metadata for title/duration).

For MVP, implement both via a field on the `garmin-import` Edge Function request: optional `workout_id`. If provided, link to existing workout. If not, auto-create a new workout.

This avoids complicating `WorkoutFormPage.tsx` for the first iteration.

---

## DB Schema Design

### `garmin_activities`

```sql
create table public.garmin_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  workout_id uuid references public.workouts(id) on delete set null,
  storage_path text not null,          -- path in Supabase Storage
  raw_data jsonb not null,             -- full parsed FIT JSON
  avg_heart_rate integer,
  max_heart_rate integer,
  hr_zone_1_seconds integer,
  hr_zone_2_seconds integer,
  hr_zone_3_seconds integer,
  hr_zone_4_seconds integer,
  hr_zone_5_seconds integer,
  training_load numeric(6,2),
  recovery_time_hours integer,
  vo2max_estimate numeric(5,2),
  total_calories integer,
  start_time timestamptz,
  elapsed_time_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `training_evaluations`

```sql
create table public.training_evaluations (
  id uuid primary key default gen_random_uuid(),
  garmin_activity_id uuid references public.garmin_activities(id) on delete cascade not null unique,
  user_id uuid references auth.users(id) on delete cascade not null,
  training_summary text not null,
  readiness_level text not null check (readiness_level in ('low', 'moderate', 'high')),
  next_training_suggestion text not null,
  adaptation_warning text,             -- null if no conflict detected
  model_used text not null,
  created_at timestamptz not null default now()
);
```

### `workouts` table alteration

```sql
alter table public.workouts
  add column if not exists garmin_activity_id uuid references public.garmin_activities(id) on delete set null;
```

Note: The FK goes `workouts → garmin_activities` (a workout optionally has one garmin activity). The `garmin_activities` table also has a reverse FK to `workouts` for standalone imports. This creates a soft circular reference — acceptable since both FKs use `ON DELETE SET NULL`.

---

## Integration Points

### WorkoutDetailPage (primary integration)

After the existing `<Card>` with workout details, conditionally render two new sections:

1. `<TrainingMetricsPanel garminActivityId={workout.garminActivityId} />` — fetches `garmin_activities` row by ID
2. `<AIEvaluationCard garminActivityId={workout.garminActivityId} />` — fetches `training_evaluations` row by FK

Both sections: show nothing if `garminActivityId` is undefined. Show a skeleton while loading.

The `useWorkout` hook currently does `select('*')` — it will automatically pick up the new `garmin_activity_id` column after migration. The `mapRow` function needs to be updated.

### WorkoutFormPage (secondary integration)

No form changes needed for MVP if we use the "auto-create workout from FIT" approach. A separate upload page/modal is cleaner than adding a file input to an already-complex form.

### New route: `/workouts/:id/import-garmin` or modal

A dedicated page or modal with a file input (`<input type="file" accept=".fit" />`), upload button, and progress indicator. After upload, redirect to `/workouts/:id` where the new metrics will appear.

Alternatively, an upload CTA button on the WorkoutDetailPage that opens a Dialog (consistent with the existing Delete confirmation Dialog pattern).

---

## Risks and Open Questions

### Risks

1. **FIT file parsing in Deno** — `fit-file-parser` is designed for Node.js. `Buffer` vs `Uint8Array` conversion may require careful handling. Must test with a real `.fit` file before committing to this library.

2. **Supabase Storage multipart upload in Edge Functions** — The Edge Function receives the `.fit` as a binary blob (multipart/form-data). Deno can handle `req.formData()` natively, but the Storage SDK must also work in Deno. Needs verification.

3. **Soft circular FK** — `workouts.garmin_activity_id → garmin_activities` and `garmin_activities.workout_id → workouts`. Postgres handles this with `DEFERRABLE` or by inserting in the right order. The safer approach: insert `garmin_activities` first (with `workout_id = null` or a new auto-created workout), then update `workouts.garmin_activity_id`.

4. **Recovery time conflict detection** — Requires knowing when the next planned workout is. The calendar feature exists (`CalendarPage`) but there's no query for "next upcoming workout after date X". This logic needs to be implemented in the Edge Function or deferred to pure frontend calculation.

5. **HR zone data from FIT** — Not all Garmin devices encode HR zone seconds. If missing, we either skip the HR zone bar or hardcode zones. Must decide before spec.

6. **File size limit** — Supabase Storage allows up to 50MB by default. `.fit` files are typically 100KB–2MB. Not a concern, but should add client-side validation (e.g. max 10MB) as a UX guard.

7. **`next_training_suggestion` CTA pre-filling the form** — The form uses `react-hook-form` with `form.reset()`. The navigation approach (pass state via router state or query params) needs to be defined. React Router v7 supports `state` on `<Link>` / `navigate()`.

### Open Questions

- **Q1**: Should the `.fit` upload be a modal on the WorkoutDetailPage, or a separate route? (UX decision for orchestrator/user)
- **Q2**: Should the Garmin import auto-create a workout if no `workout_id` is provided, or always require linking to an existing one?
- **Q3**: For the `adaptation_warning`, what is the exact window? "If next planned workout is within N hours of recovery_time_hours from now" — what is N?
- **Q4**: Should `training_evaluations` be re-generated on demand, or only once per import?
- **Q5**: Multi-sport FIT files (run + bike)? MVP scope: single-session FIT only.

---

## Recommendation

Proceed with **Approach B** (split Edge Functions). The main work units are:

1. **DB + Storage**: 3 migrations + 1 Storage bucket config
2. **Edge Functions**: 2 new functions (`garmin-import`, `training-evaluation`)
3. **React feature**: `src/features/garmin/` with upload form + metrics display
4. **WorkoutDetailPage**: Conditional sections for metrics + AI eval
5. **Types**: Update `workout.types.ts`, `mapRow.ts`, `supabase.ts`

Estimated complexity: **High** (involves DB, Storage, binary file parsing, LLM integration, and new UI components).

### Ready for Proposal

Yes — with Q1 and Q2 answered by the user. The core technical approach is clear.

---

## Exploration Notes

- No existing `garmin_activities` or `training_evaluations` tables or related code found in the codebase.
- No Supabase Storage buckets in use yet — this will be the first.
- `fit-file-parser` is not yet in `package.json` — needs to be added as a dependency.
- The `public_wods` feature (`supabase/functions/public-wods/`) shows that Edge Functions can handle more complex logic — good reference.
- The `WodFormatSelector` registry pattern in `src/features/workouts/registry/` shows the project favors extensible registries — the HR zone display could follow a similar pattern for future sensor types.
