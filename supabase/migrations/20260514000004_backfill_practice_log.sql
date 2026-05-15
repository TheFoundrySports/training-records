-- =========================================================
-- Historical backfill: populate technique_practice_log from existing data
-- One-time migration using INSERT ... ON CONFLICT DO NOTHING (idempotent)
-- =========================================================
insert into public.technique_practice_log
  (user_id, technique_id, total_practices, first_practiced_at, last_practiced_at)
select
  w.user_id,
  st.technique_id,
  count(*)                       as total_practices,
  min(w.performed_at)            as first_practiced_at,
  max(w.performed_at)            as last_practiced_at
from public.bjj_section_techniques st
join public.bjj_sections s       on s.id = st.section_id
join public.workouts w          on w.id = s.workout_id
group by w.user_id, st.technique_id
on conflict (user_id, technique_id) do nothing;

-- =========================================================
-- Verification comments:
--
-- ASSERT: backfill aggregates count(*) per (user_id, technique_id)
-- ASSERT: first_practiced_at = min(performed_at) from historical workouts
-- ASSERT: last_practiced_at = max(performed_at) from historical workouts
-- ASSERT: ON CONFLICT DO NOTHING prevents overwriting live trigger data
-- NOTE: This migration is safe to re-run — existing rows are preserved
-- NOTE: No new rows created for (user_id, technique_id) pairs already in log
-- =========================================================