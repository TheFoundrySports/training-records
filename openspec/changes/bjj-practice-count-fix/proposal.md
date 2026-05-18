# Proposal: BJJ Practice Count Fix

## Intent

The `technique_practice_log_trigger` fires `FOR EACH ROW` on `bjj_section_techniques`. When the same technique appears in N sections of a single workout, `total_practices` is incremented N times instead of 1. This inflates the count and breaks the semantics of REQ-TT1, which intends to count distinct workouts per technique, not section insertions.

## Scope

### In Scope
- New migration: add `workout_id` column + unique constraint to `technique_practice_log`; rewrite trigger with `INSERT ... ON CONFLICT (user_id, technique_id, workout_id) DO NOTHING`
- New migration: data correction for existing `total_practices` values via `count(distinct workout_id)` per `(user_id, technique_id)`
- Spec clarification: clarify REQ-TT1 semantics that `total_practices` counts distinct workouts, not row insertions

### Out of Scope
- Frontend changes
- Edge Functions
- Other tables or views

## Capabilities

### Modified Capabilities
- `technique-tracking` (REQ-TT1): Clarify that `total_practices` counts **distinct workouts** per (user_id, technique_id), not per `bjj_section_techniques` row. The trigger deduplicates by `(user_id, technique_id, workout_id)` so only the first section insertion per workout increments the count.

### New Capabilities
None.

## Approach

1. **Schema change**: Add `workout_id UUID REFERENCES bjj_workouts(id)` to `technique_practice_log`. Add unique constraint on `(user_id, technique_id, workout_id)` — this is a new deduplication layer on top of the existing `(user_id, technique_id)` aggregate row.

2. **Trigger rewrite**: The trigger on `bjj_section_techniques` inserts into `technique_practice_log` with `ON CONFLICT (user_id, technique_id, workout_id) DO NOTHING`. Only the first section insertion per workout per technique increments `total_practices`.

3. **Data correction**: A new migration recalculates `total_practices = count(distinct workout_id)` for each `(user_id, technique_id)` by querying `bjj_section_techniques` through `bjj_sections` + `bjj_workouts`.

The existing `(user_id, technique_id)` unique constraint and aggregate row behavior are preserved.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/20260514000001_technique_practice_log.sql` | Modified | Rewrite trigger function with workout-level deduplication |
| `supabase/migrations/20260518000001_correct_technique_practice_counts.sql` | New | Add `workout_id` column, constraint, correct inflated counts |
| `openspec/specs/technique-tracking/spec.md` | Modified | Clarify REQ-TT1 semantics on distinct workout counting |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Backfill migration `20260514000004` already groups by `(user_id, technique_id)` — it is correct and idempotent as-is | Low | No action needed |
| Data correction migration may temporarily lock rows during `count(distinct)` | Low | Run during low-traffic window; correction is a one-time event |
| Existing `total_practices` values are already inflated | N/A | Data correction migration fixes this |

## Rollback Plan

1. Drop the new unique constraint and `workout_id` column via a new migration: `ALTER TABLE technique_practice_log DROP COLUMN workout_id;`
2. Restore original trigger from `supabase/migrations/20260514000001_technique_practice_log.sql` history
3. Re-run the original backfill migration `20260514000004` to restore counts (groups by user+technique, so duplicates are absorbed)

## Dependencies

- `bjj_section_techniques`, `bjj_sections`, `bjj_workouts` — existing tables with existing foreign key relationships
- Backfill migration `20260514000004` — already applied, not modified

## Success Criteria

- [ ] Trigger deduplicates by `(user_id, technique_id, workout_id)` — inserting same technique in 3 sections of one workout increments `total_practices` by exactly 1
- [ ] Existing `total_practices` values corrected to count distinct `workout_id` per `(user_id, technique_id)`
- [ ] REQ-TT1 scenario in spec reflects distinct workout semantics
- [ ] No regression in existing BJJ workflow inserts or reads