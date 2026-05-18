-- Data correction migration for technique practice counts
-- Step 1: backfill dedup table from historical section data
insert into public.technique_workout_log (user_id, technique_id, workout_id, practiced_at)
select distinct
  w.user_id,
  bst.technique_id,
  w.id as workout_id,
  w.performed_at as practiced_at
from public.bjj_section_techniques bst
join public.bjj_sections s on s.id = bst.section_id
join public.workouts w on w.id = s.workout_id
on conflict (user_id, technique_id, workout_id) do nothing;

-- Step 2: correct total_practices to count distinct workouts
update public.technique_practice_log tpl
set
  total_practices   = sub.workout_count,
  first_practiced_at = sub.first_ts,
  last_practiced_at  = sub.last_ts,
  updated_at         = now()
from (
  select
    user_id,
    technique_id,
    count(*) as workout_count,
    min(practiced_at) as first_ts,
    max(practiced_at) as last_ts
  from public.technique_workout_log
  group by user_id, technique_id
) sub
where tpl.user_id      = sub.user_id
  and tpl.technique_id = sub.technique_id;