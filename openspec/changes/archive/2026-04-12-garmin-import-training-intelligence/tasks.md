# Tasks: Garmin Import + Training Intelligence

## Phase 0 — Spikes

- [ ] 0.1 Verify `fit-file-parser` via `esm.sh` works in Deno — confirm `Buffer.from(arrayBuffer)` parses a real `.fit` file without errors
- [ ] 0.2 Obtain a real `.fit` sample from a Garmin device and inspect HR zone field names (`time_in_hr_zone` vs `hr_zone_*`) — document exact field path for metrics extraction
- [ ] 0.3 Confirm `useNextWorkout` query: determine whether filtering by a "planned" status column is needed or if `performed_at > now()` is sufficient

## Phase 1 — Database

- [ ] 1.1 Create `supabase/migrations/20260412000001_create_garmin_activities.sql` — table, RLS policies (select/insert by owner), and two indexes (`workout_id`, `user_id`)
- [ ] 1.2 Create `supabase/migrations/20260412000002_create_training_evaluations.sql` — table, unique constraint on `garmin_activity_id`, RLS policies, and index
- [ ] 1.3 Create `supabase/migrations/20260412000003_workouts_garmin_activity_fk.sql` — add nullable `garmin_activity_id uuid` column with FK to `garmin_activities`
- [ ] 1.4 Create Supabase Storage bucket `garmin-fits` (private) — add RLS policy restricting access to `auth.uid()::text` folder prefix
- [ ] 1.5 Run migrations locally (`supabase db reset` or `supabase migration up`) and regenerate `src/types/supabase.ts`

## Phase 2 — Edge Functions

- [ ] 2.1 Create `supabase/functions/_shared/garmin-schemas.ts` — `GarminMetrics` type-guard, `EvaluationResponse` type-guard (`isValidEvaluationResponse`), shared type definitions
- [ ] 2.2 Create `supabase/functions/garmin-import/index.ts` — import `fit-file-parser` via `esm.sh`, implement `parseFit(buffer)` Promise wrapper, extract metrics from `data.sessions[0]` and `data.time_in_hr_zone[]`, compute HR zones from raw records as fallback
- [ ] 2.3 In `garmin-import/index.ts` — add auth check: verify requesting user owns `workout_id` (query workouts, compare `user_id`), return 403 if mismatch
- [ ] 2.4 In `garmin-import/index.ts` — upload raw file to Storage at `{userId}/{workoutId}/{timestamp}.fit`, INSERT `garmin_activities`, UPDATE `workouts.garmin_activity_id`, return `{ garmin_activity_id, metrics }`
- [ ] 2.5 In `garmin-import/index.ts` — add re-import guard: if `workouts.garmin_activity_id` is already set, delete old `garmin_activities` row before inserting new one
- [ ] 2.6 Create `supabase/functions/training-evaluation/index.ts` — fetch `garmin_activities` row, build GPT-4o-mini prompt with metrics, call OpenAI API
- [ ] 2.7 In `training-evaluation/index.ts` — run `isValidEvaluationResponse` on LLM JSON; if invalid return 422 (no DB write); if valid INSERT `training_evaluations` and return `{ evaluation }`

## Phase 3 — Client

- [ ] 3.1 Create `src/features/garmin/garmin.types.ts` — `GarminMetrics`, `GarminActivity`, `TrainingEvaluation`, `ImportResult`, `ReadinessLevel` enum
- [ ] 3.2 Update `src/features/workouts/workout.types.ts` — add `garminActivityId?: string` to `Workout` type
- [ ] 3.3 Update `src/features/workouts/hooks/mapRow.ts` — map `garmin_activity_id` snake_case → camelCase
- [ ] 3.4 Create `src/features/garmin/hooks/useGarminImport.ts` — two sequential `useMutation` calls (`importMutation` → `evalMutation`), expose `importAndEvaluate(file)`, `isImporting`, `isEvaluating`, `importResult`, `evaluation`, `error`
- [ ] 3.5 Create `src/features/garmin/hooks/useGarminActivity.ts` — query `garmin_activities` by `workout_id`
- [ ] 3.6 Create `src/features/garmin/hooks/useTrainingEvaluation.ts` — query `training_evaluations` by `garmin_activity_id`
- [ ] 3.7 Create `src/features/garmin/hooks/useNextWorkout.ts` — query next workout after a given timestamp (resolved from spike 0.3)
- [ ] 3.8 Create `src/features/garmin/hooks/useAdaptationWarning.ts` — compare `nextWorkout.performedAt < addHours(performedAt, recoveryTimeHours)`, return warning string or null
- [ ] 3.9 Create `src/features/garmin/components/GarminImportTrigger.tsx` — button visible only when `isOwner && !garminActivityId`
- [ ] 3.10 Create `src/features/garmin/components/GarminImportModal.tsx` — Dialog with file input, 10 MB client-side validation, re-import confirmation warning, loading states, error display
- [ ] 3.11 Create `src/features/garmin/components/HRZoneBar.tsx` — proportional stacked bar from `hr_zone_*_seconds` values
- [ ] 3.12 Create `src/features/garmin/components/TrainingMetricsPanel.tsx` — renders elapsed time, avg/max HR, HR zone bar, training load, recovery time, calories, VO₂max (conditional)
- [ ] 3.13 Create `src/features/garmin/components/AdaptationWarning.tsx` — prominent warning banner; hidden when `adaptationWarning` is null
- [ ] 3.14 Create `src/features/garmin/components/AIEvaluationCard.tsx` — loading skeleton while evaluating, error state, renders summary + readiness level + next suggestion + `AdaptationWarning`
- [ ] 3.15 Create `src/features/garmin/index.ts` — barrel export for all public hooks and components
- [ ] 3.16 Update `src/features/workouts/pages/WorkoutDetailPage.tsx` — add `GarminImportTrigger`, `GarminImportModal`, conditional `TrainingMetricsPanel`, conditional `AIEvaluationCard`

## Phase 4 — Tests

- [ ] 4.1 Vitest unit: `parseFit()` — happy path with `.fit` fixture, rejects on corrupt buffer (REQ-2, scenario: corrupt file)
- [ ] 4.2 Vitest unit: `isValidEvaluationResponse()` — valid object passes, missing fields fail, wrong `readiness_level` value fails (REQ-4)
- [ ] 4.3 Vitest unit: `useAdaptationWarning` — warning fires when next workout within window; null when no next workout; null when outside window (REQ-5 all three scenarios)
- [ ] 4.4 Deno integration: `garmin-import` function — valid `.fit` + owned workout returns 200 with `garmin_activity_id`; unowned workout returns 403; file > 10 MB rejected (REQ-1, REQ-7)
- [ ] 4.5 Deno integration: `training-evaluation` function — valid `garmin_activity_id` returns evaluation; mocked LLM invalid JSON returns 422 with no DB row written (REQ-4 scenario: LLM timeout/invalid)
- [ ] 4.6 Playwright E2E: full upload flow — upload `.fit` → `TrainingMetricsPanel` appears → `AIEvaluationCard` skeleton transitions to content (REQ-1 happy path, REQ-3, REQ-4)
- [ ] 4.7 Playwright E2E: re-import flow — confirmation dialog appears; on confirm old metrics replaced (REQ-6)
