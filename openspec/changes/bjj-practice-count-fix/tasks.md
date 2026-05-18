# Tasks: BJJ Practice Count Fix

**Change**: `bjj-practice-count-fix`
**Strict TDD active**: test runner `npm run test`
**TDD scope**: T4 only (trigger dedup logic). T1–T3 are migrations, T5 is spec clarification.

---

## Task List

### T1 — Create `technique_workout_log` deduplication table

**ID**: T1
**Title**: Create `technique_workout_log` dedup table with RLS and indexes
**Description**: Create the `technique_workout_log` table keyed on `(user_id, technique_id, workout_id)` with a unique constraint, RLS policies, and indexes. This is the dedup layer inserted before the aggregate upsert. Also add the nullable `workout_id` column to `technique_practice_log` as the JOIN path for data correction.
**Files to create**:
- `supabase/migrations/{ts}_technique_workout_log.sql` — new table + RLS + unique constraint + indexes

**Files to modify**:
- `supabase/migrations/{ts}_add_workout_id_to_practice_log.sql` — add nullable `workout_id uuid` column to `technique_practice_log`

**Acceptance criteria**:
- [ ] `technique_workout_log(user_id, technique_id, workout_id)` table exists with unique constraint
- [ ] RLS allows insert by owner, select by owner (mirrors `technique_practice_log` policies)
- [ ] `workout_id` FK to `bjj_workouts(id)` is NOT NULL
- [ ] Index on `(user_id, technique_id)` for read performance
- [ ] `technique_practice_log` has nullable `workout_id` column added
- [ ] Migration is idempotent (uses `create table if not exists`, `add column if not exists`)

**Estimated lines changed**: ~80–90

---

### T2 — Rewrite `update_technique_practice_log()` trigger to use dedup table

**ID**: T2
**Title**: Rewrite trigger to insert dedup row before aggregate upsert
**Description**: Replace the current trigger function with one that: (1) derives `workout_id` via the `bjj_sections` join, (2) inserts into `technique_workout_log` with `ON CONFLICT DO NOTHING`, (3) only if the dedup insert affected 1 row, increments `technique_practice_log.total_practices`. Also backfills `workout_id` on `technique_practice_log` via the same JOIN so future reads have the value.
**Files to create**:
- `supabase/migrations/{ts}_rewrite_update_technique_practice_log_trigger.sql` — drop+recreate trigger function with dedup logic; backfill `workout_id` on existing `technique_practice_log` rows

**Files to modify**:
- `supabase/migrations/{ts}_add_workout_id_to_practice_log.sql` (from T1) — may be merged into this migration if not yet applied

**Acceptance criteria**:
- [ ] Trigger fires AFTER INSERT on `bjj_section_techniques`
- [ ] `INSERT INTO technique_workout_log ... ON CONFLICT (user_id, technique_id, workout_id) DO NOTHING` runs first
- [ ] `GET DIAGNOSTICS x = row_count` captures affected rows; only `x = 1` triggers aggregate upsert
- [ ] `technique_practice_log.total_practices` increments by exactly 1 per distinct `(user_id, technique_id, workout_id)` tuple
- [ ] `last_practiced_at` updated via `greatest()` so later workout wins
- [ ] Existing `technique_practice_log` rows have `workout_id` backfilled via JOIN
- [ ] Migration is idempotent (drop function if exists, then create)

**Estimated lines changed**: ~70–80

---

### T3 — Data correction migration to fix inflated `total_practices` values

**ID**: T3
**Title**: One-time data correction migration for existing inflated counts
**Description**: Recalculate `total_practices` from actual `count(distinct workout_id)` per `(user_id, technique_id)` by querying `bjj_section_techniques` → `bjj_sections` → `bjj_workouts`. Also backfill `technique_workout_log` from existing data so the dedup table is complete.
**Files to create**:
- `supabase/migrations/{ts}_correct_inflated_technique_practice_counts.sql` — one-time UPDATE + INSERT to backfill dedup table

**Acceptance criteria**:
- [ ] `total_practices` corrected to `count(distinct workout_id)` per `(user_id, technique_id)` using the JOIN path
- [ ] `last_practiced_at` corrected to `max(performed_at)` per `(user_id, technique_id)`
- [ ] `technique_workout_log` is backfilled with all existing `(user_id, technique_id, workout_id)` combinations present in `bjj_section_techniques`
- [ ] Rows already correct are unchanged (idempotent UPDATE)
- [ ] After this migration, `select total_practices, count(distinct workout_id) from technique_workout_log group by ...` matches for all rows

**Estimated lines changed**: ~35–45

---

### T4 — Unit tests for trigger dedup logic

**ID**: T4
**Title**: Write unit tests verifying N section inserts for same technique+workout = 1 increment
**Description**: Add vitest tests for the trigger's deduplication behavior. Uses mock/stub approach to test that inserting the same technique multiple times in one workout only increments `total_practices` once. Includes a test for the correct scenario (same technique across two workouts = count of 2).
**Strict TDD** — tests must be written before implementation (or simultaneously, verified by `npm run test`).
**Files to create**:
- `src/features/bjj/technique-tracking/__tests__/technique-practice-log.test.ts` — vitest suite with describe blocks for: dedup within workout, no dedup across workouts, first insert sets timestamps correctly

**Files to modify**:
- `vitest.config.ts` — ensure test file is covered if not already
- `src/lib/supabase.ts` — add `TechniqueWorkoutLog` type if not present

**Acceptance criteria**:
- [ ] Test: insert same technique 3× in 1 workout via trigger → `total_practices = 1`
- [ ] Test: insert same technique in 2 different workouts → `total_practices = 2`
- [ ] Test: first insert sets `first_practiced_at` and `last_practiced_at` equal
- [ ] Test: subsequent inserts update `last_practiced_at` only if later
- [ ] All tests pass with `npm run test`

**Estimated lines changed**: ~90–110

---

### T5 — Update openspec REQ-TT1 spec clarification

**ID**: T5
**Title**: Clarify REQ-TT1 semantics: total_practices counts distinct workouts
**Description**: Update the `REQ-TT1` requirement in the technique-tracking spec to explicitly state that `total_practices` counts distinct `(user_id, technique_id, workout_id)` combinations, not row insertions. Add explicit scenario for same technique across multiple sections of one workout.
**Files to modify**:
- `openspec/changes/bjj-practice-count-fix/specs/technique-tracking/spec.md` — clarify REQ-TT1 language, add spec note about "distinct workouts" semantics

**Acceptance criteria**:
- [ ] REQ-TT1 explicitly states `total_practices` = count of distinct workouts (not section inserts)
- [ ] "Same technique in multiple sections of one workout counts as 1 practice" scenario is documented
- [ ] Trigger behavior section reflects the new dedup table approach

**Estimated lines changed**: ~15–25

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated total lines changed | ~290–350 |
| 400-line budget at risk? | No |
| Chained PRs recommended? | No |
| Rationale | 5 focused migrations + test file; all small and self-contained |

**Delivery strategy**: Single PR with all 5 tasks. Migration files are additive and low-risk; tests travel with T2/T4 implementation. No chained PRs needed — well under the 400-line budget.

---

## Dependency Order

```
T1 → T2 → T3 → T4
          ↘ T5 (spec clarification can run after T3 confirms behavior)
```

- T1 must complete before T2 (T2 depends on `technique_workout_log` existence)
- T2 must complete before T3 (T3 data correction reads from dedup table)
- T4 tests the trigger from T2 — run after T2 is applied
- T5 is spec-only, runs last after behavior is confirmed by T3