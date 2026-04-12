# Proposal: Garmin Import + Training Intelligence

## Intent

Athletes log workouts manually but have no way to import real performance data from Garmin devices. This means the app has zero physiological signal: no heart rate, no training load, no recovery data. Without this, AI-generated training suggestions are generic and not personalized.

This change adds `.fit` file import, parsed metrics display, and an LLM-powered training evaluation with actionable next-workout guidance and an adaptation warning when recovery time conflicts with the next planned session.

## Scope

### In Scope

- Upload a `.fit` file via a modal/dialog on `WorkoutDetailPage` (no dedicated route)
- Parse FIT metrics: avg/max HR, HR zone seconds, training load, recovery time, VO₂max estimate, calories, elapsed time
- Store raw FIT file in Supabase Storage (`garmin-fits` bucket, private, RLS to owner)
- Persist parsed metrics in new `garmin_activities` table
- Link import to an **existing** workout (no auto-create)
- Call GPT-4o-mini to produce: training summary, readiness level, next training suggestion, adaptation warning
- Store LLM result in new `training_evaluations` table
- Show metrics panel + AI evaluation card on `WorkoutDetailPage` (conditional on `garminActivityId`)
- Show adaptation warning when next planned workout is within `recovery_time_hours` of the import

### Out of Scope

- Auto-creating a workout from FIT metadata
- Dedicated import route (always modal on detail page)
- Multi-sport FIT files (MVP: single-session only)
- Re-generating AI evaluation on demand (once per import)
- Garmin Connect OAuth / direct device sync
- Background queue processing (pg_net / pg_cron)

## Approach

Split Edge Functions (Approach B from exploration):

1. **`garmin-import`** — receives `.fit` + `workout_id`, parses file, stores to Storage and `garmin_activities`, returns `garmin_activity_id`. Fast and deterministic.
2. **`training-evaluation`** — receives `garmin_activity_id`, calls GPT-4o-mini with parsed metrics, validates response with Zod, stores to `training_evaluations`. Async — UI shows skeleton while loading.

Client orchestration: two sequential mutations via `useMutation`. FIT upload completes → metrics shown immediately → AI eval loads asynchronously. Mirrors existing `ai-generate` invocation pattern.

## Key Decisions

| #   | Decision                                                                      | Rationale                                                                           |
| --- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1   | Upload via modal on `WorkoutDetailPage`                                       | Consistent with existing Delete Dialog pattern; no new route needed                 |
| 2   | Import always links to existing workout                                       | User intent is to annotate a planned workout, not create ad-hoc records             |
| 3   | Adaptation warning trigger: next planned workout within `recovery_time_hours` | Example: recovery=24h, next workout in 18h → warning shown                          |
| 4   | Split Edge Functions                                                          | Independent retry, metrics visible before AI eval, avoids LLM timeout in parse step |
| 5   | GPT-4o-mini                                                                   | `OPENAI_API_KEY` already configured — zero new secrets for MVP                      |

## Affected Areas

| Area                                                | Impact   | Description                                                                          |
| --------------------------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| `supabase/migrations/`                              | New (×3) | `garmin_activities`, `training_evaluations` tables; `workouts.garmin_activity_id` FK |
| `supabase/functions/garmin-import/`                 | New      | FIT parse + Storage upload + DB insert                                               |
| `supabase/functions/training-evaluation/`           | New      | LLM call + Zod validation + DB insert                                                |
| `supabase/functions/_shared/`                       | New      | Shared Zod schema for evaluation response                                            |
| `src/features/garmin/`                              | New      | Upload hook, display hooks, upload form, metrics panel, AI eval card, HR zone bar    |
| `src/features/workouts/workout.types.ts`            | Modified | Add `garminActivityId?: string`                                                      |
| `src/features/workouts/hooks/mapRow.ts`             | Modified | Map `garmin_activity_id`                                                             |
| `src/features/workouts/pages/WorkoutDetailPage.tsx` | Modified | Garmin modal trigger + conditional metrics/AI sections                               |
| `src/types/supabase.ts`                             | Modified | Add new table types                                                                  |

## Risks

| Risk                                                              | Likelihood | Mitigation                                                                     |
| ----------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------ |
| `fit-file-parser` callback API — Buffer vs Uint8Array in Deno     | Med        | Promisify and test with real `.fit` before building UI                         |
| Supabase Storage multipart upload in Edge Functions               | Med        | Spike with `req.formData()` + Storage SDK early                                |
| Soft circular FK (`workouts ↔ garmin_activities`) insert ordering | Low        | Always insert `garmin_activities` first, then update `workouts`                |
| HR zone data absent in some Garmin devices                        | Med        | Fallback: compute zones from raw HR data if zone seconds not present           |
| LLM timeout / hallucinated `readiness_level`                      | Low        | Zod enum validation; on parse failure return error, do not save partial result |
| Next-workout conflict query not yet implemented                   | Low        | New query in `useUpcomingWorkout` hook; scoped to calendar feature data        |

## Rollback Plan

1. Remove `workouts.garmin_activity_id` column via down migration
2. Drop `training_evaluations` and `garmin_activities` tables
3. Delete `garmin-fits` Storage bucket contents + bucket
4. Revert `WorkoutDetailPage.tsx`, `workout.types.ts`, `mapRow.ts` to previous version
5. Remove `src/features/garmin/` folder
6. Remove `supabase/functions/garmin-import/` and `supabase/functions/training-evaluation/`

No user-facing data loss beyond imported Garmin files.

## Dependencies

- `fit-file-parser` (npm) — must be importable via `https://esm.sh/` in Deno
- `OPENAI_API_KEY` env var — already set in Supabase project

## Success Criteria

- [ ] User can upload a `.fit` file from `WorkoutDetailPage` modal and link it to the current workout
- [ ] Parsed metrics (HR, zones, load, recovery) are displayed in `TrainingMetricsPanel`
- [ ] AI evaluation (summary, readiness, suggestion) appears in `AIEvaluationCard` within ~5s of upload
- [ ] Adaptation warning shown when next planned workout is scheduled within `recovery_time_hours`
- [ ] No workout is auto-created from a FIT import
- [ ] RLS enforced: users can only see their own `garmin_activities` and `training_evaluations`
- [ ] All new DB columns/tables covered by Supabase RLS policies
- [ ] Upload modal handles errors gracefully (invalid FIT, network failure, LLM failure)
