---
name: bjj-practice-count-fix
description: Bugfix — fix total_practices to count distinct workouts, not section insertions. Adds workout_id deduplication to technique_practice_log.
change: bjj-practice-count-fix
status: draft
---

# Delta for Technique Tracking

> **Domain**: `technique-tracking`
> **Change**: `bjj-practice-count-fix`

---

## MODIFIED Requirements

### REQ-TT1: Practice Frequency Aggregation

The system MUST track how many times each user practices each technique across all BJJ workouts via the `technique_practice_log` table.

The system MUST upsert `technique_practice_log` when a row is inserted into `bjj_section_techniques`, incrementing `total_practices` and updating `last_practiced_at`. On first insert, `first_practiced_at` MUST be set from the parent workout's `performed_at`.

The `user_id` is derived from the parent workout via the `bjj_sections` join.

**`total_practices` counts distinct workouts** — a technique practiced multiple times in the same workout (even across multiple sections) counts as ONE practice.

#### Scenario: Practice count increments on new technique linking

- GIVEN a BJJ workout exists with `performed_at = 2026-05-10`
- WHEN the athlete's AI-enhanced section stores `[Knee Slide Pass]` in `bjj_section_techniques`
- THEN the system MUST create (or upsert) a `technique_practice_log` row with `total_practices = 1`, `first_practiced_at = 2026-05-10`, `last_practiced_at = 2026-05-10`
- AND subsequent inserts for the same (user_id, technique_id) from a DIFFERENT workout MUST increment `total_practices` and update `last_practiced_at`

#### Scenario: Multiple techniques in same section

- GIVEN a BJJ section links 3 techniques to `bjj_section_techniques`
- WHEN the trigger fires for each insert
- THEN the system MUST create 3 separate `technique_practice_log` rows (one per technique_id)
- AND each row's `total_practices = 1` on first insert

#### Scenario: Same technique in multiple sections of one workout counts as 1 practice

- GIVEN a BJJ workout with 3 sections, all containing "Triangle Choke"
- WHEN the sections are saved (3 inserts into `bjj_section_techniques`)
- THEN `technique_practice_log.total_practices` MUST equal 1 for that (user, technique) pair
- AND `last_practiced_at` MUST reflect the latest section insert timestamp within that workout

#### Scenario: Same technique in two different workouts counts as 2 practices

- GIVEN a user has two separate BJJ workouts, each with "Triangle Choke" in at least one section
- WHEN both workouts are saved
- THEN `technique_practice_log.total_practices` MUST equal 2
- AND `last_practiced_at` MUST reflect the most recent workout date

---

## Data Model

### ADDED

| Table / Constraint | Description |
|---|---|
| `technique_workout_log` | Deduplication table keyed on `(user_id, technique_id, workout_id)` |
| `technique_workout_log_user_technique_workout_uidx` | Unique index on `(user_id, technique_id, workout_id)` |
| `technique_workout_log_workout_fk` | FK to `bjj_workouts(id)` |

The `technique_practice_log` table and its `technique_practice_log_unique` constraint on `(user_id, technique_id)` are unchanged — they remain the aggregate row source.

---

## Trigger Behavior

The `update_technique_practice_log()` trigger on `bjj_section_techniques` MUST:

1. Derive `v_workout_id` from the `bjj_sections` join to `bjj_workouts`
2. Attempt `INSERT INTO technique_workout_log (user_id, technique_id, workout_id) ON CONFLICT (user_id, technique_id, workout_id) DO NOTHING`
3. Only if the insert affected 1 row (new workout for this technique), increment the aggregate `technique_practice_log.total_practices` and update timestamps
