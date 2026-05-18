# Design: BJJ Practice Count Fix

## Technical Approach

Fix the `update_technique_practice_log()` trigger to deduplicate by `(user_id, technique_id, workout_id)` so that inserting the same technique across multiple sections of a single workout counts as exactly 1 practice.

**Approach**: Use a deduplication table `technique_workout_log` inserted first; only increment `total_practices` in `technique_practice_log` if the dedup insert succeeded.

## Architecture Decisions

### Decision: Deduplication table over row-per-workout rewrite

**Choice**: Approach C — add `technique_workout_log` dedup table, keep `technique_practice_log` aggregate row unchanged
**Alternatives considered**:
- Approach A (keep aggregate row, add dedup table): identical — same choice by different name
- Approach B (row per workout): would require rewriting `technique_practice_log` to store per-workout rows and deriving `total_practices` as `COUNT(*)`, breaking `technique_learning_status` view and frontend hooks
**Rationale**: Lowest migration risk — `technique_practice_log` schema is unchanged, the unique constraint `(user_id, technique_id)` is unchanged, the `technique_learning_status` view is unchanged, and frontend components read `total_practices` from the same column they already do. The dedup table is a new object inserted before the aggregate upsert.

## Schema Changes

| File | Action | Change |
|------|--------|--------|
| `supabase/migrations/{timestamp}_technique_workout_log.sql` | Create | New table `technique_workout_log(user_id, technique_id, workout_id)` with unique constraint |
| `supabase/migrations/{timestamp}_add_workout_fk_to_technique_practice_log.sql` | Create | Add nullable `workout_id` column to `technique_practice_log` (for trigger JOIN path) |
| `supabase/migrations/{timestamp}_rewrite_update_technique_practice_log_trigger.sql` | Create | Rewrite trigger to dedup via `technique_workout_log` before upserting aggregate |
| `supabase/migrations/{timestamp}_correct_inflated_technique_practice_counts.sql` | Create | Data correction: recalculate `total_practices` from `count(distinct workout_id)` per `(user_id, technique_id)` |

### New table: `technique_workout_log`

```sql
create table public.technique_workout_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  technique_id uuid not null references public.bjj_techniques(id) on delete cascade,
  workout_id  uuid not null references public.bjj_workouts(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint technique_workout_log_unique unique (user_id, technique_id, workout_id)
);
```

- `workout_id` is NOT NULL — every row must represent a real workout
- The unique constraint is the deduplication key
- RLS policies mirror `technique_practice_log` (user insertable, user readable)

## Trigger Rewrite

```
update_technique_practice_log() on bjj_section_techniques INSERT:
  1. Derive v_user_id, v_performed_at, v_workout_id from bjj_sections join
  2. INSERT INTO technique_workout_log (user_id, technique_id, workout_id)
     VALUES (v_user_id, new.technique_id, v_workout_id)
     ON CONFLICT (user_id, technique_id, workout_id) DO NOTHING
     → GETTING v_dedup = (sql%rowcount = 1)  -- true only if new workout-technique
  3. IF v_dedup THEN
       INSERT INTO technique_practice_log (user_id, technique_id, total_practices, first/last_practiced_at)
       VALUES (v_user_id, new.technique_id, 1, v_performed_at, v_performed_at)
       ON CONFLICT (user_id, technique_id) DO UPDATE SET
         total_practices = technique_practice_log.total_practices + 1,
         last_practiced_at = greatest(technique_practice_log.last_practiced_at, v_performed_at),
         updated_at = now()
     END IF
```

## Data Flow

```
bjj_section_techniques INSERT
        │
        ▼
update_technique_practice_log() trigger
        │
        ├─[step 2]─▶ technique_workout_log ── (user_id, technique_id, workout_id) unique
        │                        │ ON CONFLICT DO NOTHING
        │                        ▼
        │                   rowcount=1?
        │                      /    \
        │                    NO      YES ──▶ increment total_practices
        │                   (dup)    (new workout)
        │
        └─[step 3]─▶ technique_practice_log (aggregate, unchanged schema)
```

## Migration Sequence

1. **`{ts}_technique_workout_log.sql`** — create dedup table with RLS and unique constraint
2. **`{ts}_add_workout_id_column.sql`** — add nullable `workout_id uuid` to `technique_practice_log`
3. **`{ts}_rewrite_trigger.sql`** — replace trigger function with dedup logic
4. **`{ts}_correct_inflated_counts.sql`** — one-time data correction:
   ```sql
   update technique_practice_log tpl
   set total_practices = correct.count,
       last_practiced_at = correct.latest
   from (
     select user_id, technique_id,
            count(distinct workout_id) as count,
            max(performed_at) as latest
     from bjj_section_techniques bst
     join bjj_sections bs on bs.id = bst.section_id
     join bjj_workouts bw on bw.id = bs.workout_id
     group by user_id, technique_id
   ) as correct
   where correct.user_id = tpl.user_id
     and correct.technique_id = tpl.technique_id;
   ```
5. **`{ts}_set_workout_id_not_null.sql`** — after backfill, set `workout_id` NOT NULL

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Trigger dedup: same technique 3× in 1 workout → count = 1 | Mock `bjj_section_techniques` + assert `total_practices` after trigger |
| Unit | Trigger: same technique 1× each in 2 workouts → count = 2 | Two inserts from different `workout_id` → assert count = 2 |
| Unit | Data correction migration corrects inflated counts | Insert 3 rows with same workout_id, verify count = 1 after correction |
| Integration | Full workflow: create BJJ workout with duplicate techniques → badge shows correct count | API test with real DB |

## Open Questions

None. Design is fully specified.