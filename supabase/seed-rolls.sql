-- =========================================================
-- Seed: realistic BJJ workouts + sections + confirmed roll events
-- Purpose: provide non-zero data for /bjj/dashboard visual review
-- Idempotent: on conflict (id) do nothing
-- Dates use now() - interval 'N days' so data is always 'recent'
-- regardless of when seed.sql runs.
--
-- PRACTICE COUNT CAP (per design D4):
--   The per-workout dedup trigger caps each technique at one count per
--   workout. With 9 BJJ workouts, the maximum practice_count is 9.
--   data.json's top count of ~8 is reachable. Do not modify the trigger.
-- =========================================================

-- ── Workouts (9 BJJ type, spread across 35 days) ────────────
insert into public.workouts (id, user_id, title, type, performed_at, duration_minutes, notes, rpe) values ('aaaaaaaa-1000-0000-0000-000000000001', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'Morning rolls — guard focus', 'bjj', now() - interval '2 days', 75, '', 7) on conflict (id) do nothing;
insert into public.workouts (id, user_id, title, type, performed_at, duration_minutes, notes, rpe) values ('aaaaaaaa-1000-0000-0000-000000000002', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'Competition prep — passing drills', 'bjj', now() - interval '5 days', 90, '', 8) on conflict (id) do nothing;
insert into public.workouts (id, user_id, title, type, performed_at, duration_minutes, notes, rpe) values ('aaaaaaaa-1000-0000-0000-000000000003', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'Open mat Sunday', 'bjj', now() - interval '9 days', 60, '', 6) on conflict (id) do nothing;
insert into public.workouts (id, user_id, title, type, performed_at, duration_minutes, notes, rpe) values ('aaaaaaaa-1000-0000-0000-000000000004', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'Private lesson — back attacks', 'bjj', now() - interval '14 days', 60, '', 7) on conflict (id) do nothing;
insert into public.workouts (id, user_id, title, type, performed_at, duration_minutes, notes, rpe) values ('aaaaaaaa-1000-0000-0000-000000000005', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'No-gi training', 'bjj', now() - interval '21 days', 75, '', 8) on conflict (id) do nothing;
insert into public.workouts (id, user_id, title, type, performed_at, duration_minutes, notes, rpe) values ('aaaaaaaa-1000-0000-0000-000000000006', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'Fundamentals class', 'bjj', now() - interval '28 days', 60, '', 5) on conflict (id) do nothing;
insert into public.workouts (id, user_id, title, type, performed_at, duration_minutes, notes, rpe) values ('aaaaaaaa-1000-0000-0000-000000000007', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'Evening training — sweeps', 'bjj', now() - interval '12 days', 75, '', 7) on conflict (id) do nothing;
insert into public.workouts (id, user_id, title, type, performed_at, duration_minutes, notes, rpe) values ('aaaaaaaa-1000-0000-0000-000000000008', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'Open mat — transitions', 'bjj', now() - interval '17 days', 60, '', 6) on conflict (id) do nothing;
insert into public.workouts (id, user_id, title, type, performed_at, duration_minutes, notes, rpe) values ('aaaaaaaa-1000-0000-0000-000000000009', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'Advanced class — submissions', 'bjj', now() - interval '32 days', 90, '', 8) on conflict (id) do nothing;

-- ── bjj_sections (18 total, 2 per workout) ─────────────────────────────────
insert into public.bjj_sections (id, workout_id, section_number, goal, raw_description, duration_minutes) values ('bbbbbbbb-2000-0000-0000-000000000001', 'aaaaaaaa-1000-0000-0000-000000000001', 1, 'Open mat sparring — guard retention', null, null) on conflict (id) do nothing;
insert into public.bjj_sections (id, workout_id, section_number, goal, raw_description, duration_minutes) values ('bbbbbbbb-2000-0000-0000-000000000002', 'aaaaaaaa-1000-0000-0000-000000000001', 2, 'Submission attempts from closed guard', null, null) on conflict (id) do nothing;
insert into public.bjj_sections (id, workout_id, section_number, goal, raw_description, duration_minutes) values ('bbbbbbbb-2000-0000-0000-000000000003', 'aaaaaaaa-1000-0000-0000-000000000002', 1, 'Passing drills with resistance', null, null) on conflict (id) do nothing;
insert into public.bjj_sections (id, workout_id, section_number, goal, raw_description, duration_minutes) values ('bbbbbbbb-2000-0000-0000-000000000004', 'aaaaaaaa-1000-0000-0000-000000000002', 2, 'Live rounds — passing vs retention', null, null) on conflict (id) do nothing;
insert into public.bjj_sections (id, workout_id, section_number, goal, raw_description, duration_minutes) values ('bbbbbbbb-2000-0000-0000-000000000005', 'aaaaaaaa-1000-0000-0000-000000000003', 1, 'Warm-up rolls', null, null) on conflict (id) do nothing;
insert into public.bjj_sections (id, workout_id, section_number, goal, raw_description, duration_minutes) values ('bbbbbbbb-2000-0000-0000-000000000006', 'aaaaaaaa-1000-0000-0000-000000000003', 2, 'Sparring with blue belt', null, null) on conflict (id) do nothing;
insert into public.bjj_sections (id, workout_id, section_number, goal, raw_description, duration_minutes) values ('bbbbbbbb-2000-0000-0000-000000000007', 'aaaaaaaa-1000-0000-0000-000000000003', 3, 'Submission only rounds', null, null) on conflict (id) do nothing;
insert into public.bjj_sections (id, workout_id, section_number, goal, raw_description, duration_minutes) values ('bbbbbbbb-2000-0000-0000-000000000008', 'aaaaaaaa-1000-0000-0000-000000000004', 1, 'Back take drills', null, null) on conflict (id) do nothing;
insert into public.bjj_sections (id, workout_id, section_number, goal, raw_description, duration_minutes) values ('bbbbbbbb-2000-0000-0000-000000000009', 'aaaaaaaa-1000-0000-0000-000000000004', 2, 'Live from back', null, null) on conflict (id) do nothing;
insert into public.bjj_sections (id, workout_id, section_number, goal, raw_description, duration_minutes) values ('bbbbbbbb-2000-0000-0000-000000000010', 'aaaaaaaa-1000-0000-0000-000000000005', 1, 'No-gi warm-up', null, null) on conflict (id) do nothing;
insert into public.bjj_sections (id, workout_id, section_number, goal, raw_description, duration_minutes) values ('bbbbbbbb-2000-0000-0000-000000000011', 'aaaaaaaa-1000-0000-0000-000000000005', 2, 'No-gi sparring', null, null) on conflict (id) do nothing;
insert into public.bjj_sections (id, workout_id, section_number, goal, raw_description, duration_minutes) values ('bbbbbbbb-2000-0000-0000-000000000012', 'aaaaaaaa-1000-0000-0000-000000000005', 3, 'Submission attempts', null, null) on conflict (id) do nothing;
insert into public.bjj_sections (id, workout_id, section_number, goal, raw_description, duration_minutes) values ('bbbbbbbb-2000-0000-0000-000000000013', 'aaaaaaaa-1000-0000-0000-000000000006', 1, 'Positional sparring — side control', null, null) on conflict (id) do nothing;
insert into public.bjj_sections (id, workout_id, section_number, goal, raw_description, duration_minutes) values ('bbbbbbbb-2000-0000-0000-000000000014', 'aaaaaaaa-1000-0000-0000-000000000006', 2, 'Live rolls', null, null) on conflict (id) do nothing;
insert into public.bjj_sections (id, workout_id, section_number, goal, raw_description, duration_minutes) values ('bbbbbbbb-2000-0000-0000-000000000015', 'aaaaaaaa-1000-0000-0000-000000000007', 1, 'Sweep drills', null, null) on conflict (id) do nothing;
insert into public.bjj_sections (id, workout_id, section_number, goal, raw_description, duration_minutes) values ('bbbbbbbb-2000-0000-0000-000000000016', 'aaaaaaaa-1000-0000-0000-000000000007', 2, 'Live from guard', null, null) on conflict (id) do nothing;
insert into public.bjj_sections (id, workout_id, section_number, goal, raw_description, duration_minutes) values ('bbbbbbbb-2000-0000-0000-000000000017', 'aaaaaaaa-1000-0000-0000-000000000008', 1, 'Transition drills', null, null) on conflict (id) do nothing;
insert into public.bjj_sections (id, workout_id, section_number, goal, raw_description, duration_minutes) values ('bbbbbbbb-2000-0000-0000-000000000018', 'aaaaaaaa-1000-0000-0000-000000000009', 1, 'Advanced submissions', null, null) on conflict (id) do nothing;

-- ── bjj_section_techniques (deterministic, covers all 7 categories) ───────────────────────────────────
-- 14 distinct techniques across: submission (4), sweep (2), escape (2), guard_pass (2), takedown (2), transition (1), other (1)
-- Design D4: explicit name-based lookups ensure deterministic seeding across resets

-- Submissions (4): Triangle, Armbar, Kimura, Rear Naked
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000002', (select id from public.bjj_techniques where name = 'Triangle Choke')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000002', (select id from public.bjj_techniques where name = 'Armbar')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000007', (select id from public.bjj_techniques where name = 'Kimura')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000009', (select id from public.bjj_techniques where name = 'Rear Naked Choke')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000012', (select id from public.bjj_techniques where name = 'Triangle Choke')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000012', (select id from public.bjj_techniques where name = 'Armbar')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000018', (select id from public.bjj_techniques where name = 'Kimura')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000018', (select id from public.bjj_techniques where name = 'Rear Naked Choke')) on conflict do nothing;

-- Sweeps (2): Butterfly Sweep, Scissor Sweep
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000001', (select id from public.bjj_techniques where name = 'Butterfly Sweep')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000005', (select id from public.bjj_techniques where name = 'Scissor Sweep')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000015', (select id from public.bjj_techniques where name = 'Butterfly Sweep')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000015', (select id from public.bjj_techniques where name = 'Scissor Sweep')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000016', (select id from public.bjj_techniques where name = 'Butterfly Sweep')) on conflict do nothing;

-- Escapes (2): Mount Escape, Side Control Escape
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000001', (select id from public.bjj_techniques where name = 'Mount Escape')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000004', (select id from public.bjj_techniques where name = 'Side Control Escape')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000006', (select id from public.bjj_techniques where name = 'Mount Escape')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000011', (select id from public.bjj_techniques where name = 'Side Control Escape')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000013', (select id from public.bjj_techniques where name = 'Side Control Escape')) on conflict do nothing;

-- Guard passes (2): Knee Slide Pass, Leg Drag Pass
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000003', (select id from public.bjj_techniques where name = 'Knee Slide Pass')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000003', (select id from public.bjj_techniques where name = 'Leg Drag Pass')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000004', (select id from public.bjj_techniques where name = 'Knee Slide Pass')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000004', (select id from public.bjj_techniques where name = 'Leg Drag Pass')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000014', (select id from public.bjj_techniques where name = 'Knee Slide Pass')) on conflict do nothing;

-- Takedowns (2): Double Leg, Single Leg
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000005', (select id from public.bjj_techniques where name = 'Double Leg Takedown')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000010', (select id from public.bjj_techniques where name = 'Single Leg Takedown')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000011', (select id from public.bjj_techniques where name = 'Double Leg Takedown')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000014', (select id from public.bjj_techniques where name = 'Single Leg Takedown')) on conflict do nothing;

-- Transitions (2): Back Take, Guard Recovery
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000008', (select id from public.bjj_techniques where name = 'Back Take')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000008', (select id from public.bjj_techniques where name = 'Guard Recovery')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000017', (select id from public.bjj_techniques where name = 'Back Take')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000017', (select id from public.bjj_techniques where name = 'Guard Recovery')) on conflict do nothing;

-- Other (1): Grip Fighting
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000006', (select id from public.bjj_techniques where name = 'Grip Fighting')) on conflict do nothing;
insert into public.bjj_section_techniques (section_id, technique_id) values ('bbbbbbbb-2000-0000-0000-000000000016', (select id from public.bjj_techniques where name = 'Grip Fighting')) on conflict do nothing;

-- ── Fail-loud guard: abort if any technique name lookup fails ─────────────────────
do $$
declare
  v_missing_techniques text[];
begin
  -- Check each of the 14 technique names used above
  select array_agg(expected_name)
  into v_missing_techniques
  from (
    values
      ('Triangle Choke'),
      ('Armbar'),
      ('Kimura'),
      ('Rear Naked Choke'),
      ('Butterfly Sweep'),
      ('Scissor Sweep'),
      ('Mount Escape'),
      ('Side Control Escape'),
      ('Knee Slide Pass'),
      ('Leg Drag Pass'),
      ('Double Leg Takedown'),
      ('Single Leg Takedown'),
      ('Back Take'),
      ('Guard Recovery'),
      ('Grip Fighting')
  ) as expected(expected_name)
  where not exists (
    select 1 from public.bjj_techniques t where t.name = expected.expected_name
  );

  if array_length(v_missing_techniques, 1) > 0 then
    raise exception 'SEED ABORT: technique name lookup failed for: %', array_to_string(v_missing_techniques, ', ')
      using hint = 'Ensure seed.sql declares these techniques in the bjj_techniques insert before seed-rolls.sql runs.';
  end if;
end;
$$;

-- ── bjj_roll_events (all status=confirmed, source=manual) ────
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000001', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000001', 1, 'defending', 'position_gain', 'closed_guard', 'open_guard', '{}', 0.87, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000002', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000001', 2, 'attacking', 'position_loss', 'open_guard', 'half_guard', '{}', 0.9, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000003', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000001', 3, 'attacking', 'submission', 'turtle', 'mount', '{}', 0.82, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000004', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000001', 4, 'attacking', 'position_gain', 'standing', 'open_guard', '{}', 0.89, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000005', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000001', 5, 'defending', 'position_loss', 'mount', 'back_control', '{}', 0.95, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000006', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000002', 1, 'attacking', 'position_loss', 'standing', 'open_guard', '{}', 0.89, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000007', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000002', 2, 'defending', 'submission', 'closed_guard', 'open_guard', '{}', 0.92, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000008', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000002', 3, 'neutral', 'position_loss', 'mount', 'back_control', '{}', 0.86, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000009', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000001', 'bbbbbbbb-2000-0000-0000-000000000002', 4, 'defending', 'position_loss', 'open_guard', 'half_guard', '{}', 0.86, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000010', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000002', 'bbbbbbbb-2000-0000-0000-000000000003', 1, 'attacking', 'position_gain', 'side_control', 'mount', '{}', 0.89, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000011', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000002', 'bbbbbbbb-2000-0000-0000-000000000003', 2, 'attacking', 'position_loss', 'open_guard', 'half_guard', '{}', 0.87, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000012', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000002', 'bbbbbbbb-2000-0000-0000-000000000003', 3, 'attacking', 'neutral', 'closed_guard', 'open_guard', '{}', 0.9, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000013', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000002', 'bbbbbbbb-2000-0000-0000-000000000003', 4, 'defending', 'position_loss', 'closed_guard', 'open_guard', '{}', 0.92, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000014', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000002', 'bbbbbbbb-2000-0000-0000-000000000003', 5, 'defending', 'position_gain', 'side_control', 'mount', '{}', 0.83, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000015', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000002', 'bbbbbbbb-2000-0000-0000-000000000003', 6, 'neutral', 'position_loss', 'turtle', 'mount', '{}', 0.83, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000016', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000002', 'bbbbbbbb-2000-0000-0000-000000000004', 1, 'defending', 'position_loss', 'side_control', 'back_control', '{}', 0.82, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000017', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000002', 'bbbbbbbb-2000-0000-0000-000000000004', 2, 'attacking', 'position_loss', 'side_control', 'knee_on_belly', '{}', 0.91, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000018', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000002', 'bbbbbbbb-2000-0000-0000-000000000004', 3, 'attacking', 'position_loss', 'standing', 'open_guard', '{}', 0.83, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000019', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000002', 'bbbbbbbb-2000-0000-0000-000000000004', 4, 'neutral', 'position_gain', 'side_control', 'mount', '{}', 0.91, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000020', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000002', 'bbbbbbbb-2000-0000-0000-000000000004', 5, 'defending', 'submission', 'open_guard', 'half_guard', '{}', 0.92, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000021', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000003', 'bbbbbbbb-2000-0000-0000-000000000005', 1, 'attacking', 'submission', 'mount', 'submission', '{}', 0.89, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000022', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000003', 'bbbbbbbb-2000-0000-0000-000000000005', 2, 'defending', 'position_gain', 'standing', 'closed_guard', '{}', 0.9, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000023', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000003', 'bbbbbbbb-2000-0000-0000-000000000005', 3, 'attacking', 'position_loss', 'side_control', 'knee_on_belly', '{}', 0.92, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000024', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000003', 'bbbbbbbb-2000-0000-0000-000000000005', 4, 'attacking', 'position_gain', 'open_guard', 'half_guard', '{}', 0.87, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000025', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000003', 'bbbbbbbb-2000-0000-0000-000000000006', 1, 'neutral', 'position_loss', 'side_control', 'knee_on_belly', '{}', 0.95, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000026', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000003', 'bbbbbbbb-2000-0000-0000-000000000006', 2, 'defending', 'position_gain', 'mount', 'back_control', '{}', 0.93, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000027', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000003', 'bbbbbbbb-2000-0000-0000-000000000006', 3, 'attacking', 'position_loss', 'half_guard', 'side_control', '{}', 0.82, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000028', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000003', 'bbbbbbbb-2000-0000-0000-000000000006', 4, 'defending', 'position_gain', 'standing', 'closed_guard', '{}', 0.89, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000029', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000003', 'bbbbbbbb-2000-0000-0000-000000000006', 5, 'defending', 'submission', 'standing', 'open_guard', '{}', 0.93, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000030', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000003', 'bbbbbbbb-2000-0000-0000-000000000007', 1, 'defending', 'position_gain', 'closed_guard', 'side_control', '{}', 0.84, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000031', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000003', 'bbbbbbbb-2000-0000-0000-000000000007', 2, 'defending', 'submission', 'open_guard', 'closed_guard', '{}', 0.92, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000032', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000003', 'bbbbbbbb-2000-0000-0000-000000000007', 3, 'neutral', 'position_gain', 'back_control', 'submission', '{}', 0.82, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000033', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000004', 'bbbbbbbb-2000-0000-0000-000000000008', 1, 'defending', 'position_gain', 'side_control', 'knee_on_belly', '{}', 0.88, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000034', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000004', 'bbbbbbbb-2000-0000-0000-000000000008', 2, 'defending', 'neutral', 'half_guard', 'side_control', '{}', 0.91, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000035', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000004', 'bbbbbbbb-2000-0000-0000-000000000008', 3, 'attacking', 'position_loss', 'standing', 'open_guard', '{}', 0.87, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000036', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000004', 'bbbbbbbb-2000-0000-0000-000000000008', 4, 'defending', 'submission', 'closed_guard', 'open_guard', '{}', 0.81, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000037', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000004', 'bbbbbbbb-2000-0000-0000-000000000008', 5, 'attacking', 'position_loss', 'closed_guard', 'open_guard', '{}', 0.8, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000038', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000004', 'bbbbbbbb-2000-0000-0000-000000000009', 1, 'defending', 'submission', 'side_control', 'mount', '{}', 0.94, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000039', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000004', 'bbbbbbbb-2000-0000-0000-000000000009', 2, 'defending', 'submission', 'closed_guard', 'open_guard', '{}', 0.84, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000040', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000004', 'bbbbbbbb-2000-0000-0000-000000000009', 3, 'defending', 'position_gain', 'open_guard', 'closed_guard', '{}', 0.84, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000041', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000004', 'bbbbbbbb-2000-0000-0000-000000000009', 4, 'defending', 'position_gain', 'mount', 'back_control', '{}', 0.81, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000042', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000005', 'bbbbbbbb-2000-0000-0000-000000000010', 1, 'attacking', 'position_gain', 'side_control', 'back_control', '{}', 0.93, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000043', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000005', 'bbbbbbbb-2000-0000-0000-000000000010', 2, 'attacking', 'position_loss', 'mount', 'back_control', '{}', 0.81, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000044', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000005', 'bbbbbbbb-2000-0000-0000-000000000010', 3, 'defending', 'position_loss', 'mount', 'back_control', '{}', 0.84, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000045', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000005', 'bbbbbbbb-2000-0000-0000-000000000010', 4, 'attacking', 'position_gain', 'leg_entanglement', 'submission', '{}', 0.83, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000046', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000005', 'bbbbbbbb-2000-0000-0000-000000000011', 1, 'defending', 'position_loss', 'side_control', 'mount', '{}', 0.87, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000047', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000005', 'bbbbbbbb-2000-0000-0000-000000000011', 2, 'defending', 'position_loss', 'closed_guard', 'side_control', '{}', 0.9, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000048', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000005', 'bbbbbbbb-2000-0000-0000-000000000011', 3, 'defending', 'submission', 'side_control', 'mount', '{}', 0.94, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000049', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000005', 'bbbbbbbb-2000-0000-0000-000000000011', 4, 'defending', 'submission', 'open_guard', 'closed_guard', '{}', 0.87, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000050', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000005', 'bbbbbbbb-2000-0000-0000-000000000011', 5, 'defending', 'neutral', 'open_guard', 'half_guard', '{}', 0.86, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000051', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000005', 'bbbbbbbb-2000-0000-0000-000000000011', 6, 'neutral', 'position_gain', 'side_control', 'back_control', '{}', 0.84, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000052', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000005', 'bbbbbbbb-2000-0000-0000-000000000012', 1, 'defending', 'position_loss', 'open_guard', 'closed_guard', '{}', 0.82, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000053', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000005', 'bbbbbbbb-2000-0000-0000-000000000012', 2, 'attacking', 'neutral', 'closed_guard', 'side_control', '{}', 0.91, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000054', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000005', 'bbbbbbbb-2000-0000-0000-000000000012', 3, 'attacking', 'position_loss', 'open_guard', 'half_guard', '{}', 0.81, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000055', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000005', 'bbbbbbbb-2000-0000-0000-000000000012', 4, 'defending', 'position_loss', 'side_control', 'mount', '{}', 0.89, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000056', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000006', 'bbbbbbbb-2000-0000-0000-000000000013', 1, 'defending', 'position_gain', 'mount', 'back_control', '{}', 0.94, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000057', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000006', 'bbbbbbbb-2000-0000-0000-000000000013', 2, 'defending', 'position_loss', 'closed_guard', 'side_control', '{}', 0.89, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000058', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000006', 'bbbbbbbb-2000-0000-0000-000000000013', 3, 'attacking', 'position_loss', 'turtle', 'mount', '{}', 0.94, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000059', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000006', 'bbbbbbbb-2000-0000-0000-000000000013', 4, 'attacking', 'position_loss', 'closed_guard', 'open_guard', '{}', 0.84, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000060', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000006', 'bbbbbbbb-2000-0000-0000-000000000014', 1, 'attacking', 'position_loss', 'side_control', 'back_control', '{}', 0.85, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000061', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000006', 'bbbbbbbb-2000-0000-0000-000000000014', 2, 'defending', 'submission', 'side_control', 'back_control', '{}', 0.89, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000062', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000006', 'bbbbbbbb-2000-0000-0000-000000000014', 3, 'defending', 'submission', 'half_guard', 'side_control', '{}', 0.88, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000063', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000006', 'bbbbbbbb-2000-0000-0000-000000000014', 4, 'attacking', 'position_gain', 'side_control', 'mount', '{}', 0.93, null, 'confirmed', 'manual') on conflict (id) do nothing;
insert into public.bjj_roll_events (id, user_id, workout_id, section_id, roll_index, role, outcome, position_from, position_to, technique_ids, confidence, raw_excerpt, status, source) values ('dddddddd-4000-0000-0000-000000000064', (select id from auth.users where email = 'athlete1@example.com' limit 1), 'aaaaaaaa-1000-0000-0000-000000000006', 'bbbbbbbb-2000-0000-0000-000000000014', 5, 'attacking', 'submission', 'half_guard', 'turtle', '{}', 0.89, null, 'confirmed', 'manual') on conflict (id) do nothing;

-- Extra rolls on workouts 7–8 (inside the 30d window) so Roll Flow can
-- match Open Design data.json counts: 24, 18, 14, 12, 10, 9, 7 (sum 94).
insert into public.bjj_roll_events (
  id, user_id, workout_id, section_id, roll_index,
  role, outcome, position_from, position_to,
  technique_ids, confidence, raw_excerpt, status, source
)
select
  ('dddddddd-4000-0000-0000-' || lpad((64 + gs.n)::text, 12, '0'))::uuid,
  (select id from auth.users where email = 'athlete1@example.com' limit 1),
  case
    when gs.n <= 20 then 'aaaaaaaa-1000-0000-0000-000000000007'::uuid
    else 'aaaaaaaa-1000-0000-0000-000000000008'::uuid
  end,
  case
    when gs.n <= 10 then 'bbbbbbbb-2000-0000-0000-000000000015'::uuid
    when gs.n <= 20 then 'bbbbbbbb-2000-0000-0000-000000000016'::uuid
    else 'bbbbbbbb-2000-0000-0000-000000000017'::uuid
  end,
  case
    when gs.n <= 10 then gs.n
    when gs.n <= 20 then gs.n - 10
    else gs.n - 20
  end,
  (array['attacking', 'defending', 'neutral'])[1 + ((gs.n - 1) % 3)]::public.bjj_roll_role,
  (array['position_gain', 'position_loss', 'submission', 'neutral'])[1 + ((gs.n - 1) % 4)]::public.bjj_roll_outcome,
  'standing',
  'closed_guard',
  '{}',
  0.9,
  null,
  'confirmed',
  'manual'
from generate_series(1, 30) as gs(n)
on conflict (id) do nothing;

-- Concentrate athlete1 seed rolls onto Open Design's 7 roll-flow edges.
-- Canonical keys only (no "RNC finish" / "Triangle attempt" — those are
-- not bjj_positions keys). Closest mapping:
--   Standing → Closed guard          × 24
--   Closed guard → Side control      × 18
--   Side control → Back control      × 14   (design: Back mount)
--   Back control → Mount             × 12   (design: RNC finish)
--   Closed guard → Open guard        × 10   (design: Triangle attempt)
--   Half guard → Mount               × 9    (design: Sweep to top)
--   Side control → Mount             × 7
-- Re-runnable: ON CONFLICT DO NOTHING would leave old pairs in place.
with ordered as (
  select
    id,
    row_number() over (order by id) as n
  from public.bjj_roll_events
  where id between
    'dddddddd-4000-0000-0000-000000000001'::uuid
    and 'dddddddd-4000-0000-0000-000000000094'::uuid
),
mapped as (
  select
    id,
    case
      when n <= 24 then 'standing'
      when n <= 42 then 'closed_guard'
      when n <= 56 then 'side_control'
      when n <= 68 then 'back_control'
      when n <= 78 then 'closed_guard'
      when n <= 87 then 'half_guard'
      else 'side_control'
    end as position_from,
    case
      when n <= 24 then 'closed_guard'
      when n <= 42 then 'side_control'
      when n <= 56 then 'back_control'
      when n <= 68 then 'mount'
      when n <= 78 then 'open_guard'
      when n <= 87 then 'mount'
      else 'mount'
    end as position_to
  from ordered
)
update public.bjj_roll_events r
set
  position_from = m.position_from,
  position_to = m.position_to,
  updated_at = now()
from mapped m
where r.id = m.id;

-- ── Set-based technique_ids backfill (keeps hero stat in agreement with list) ────
-- Design D4: aggregate section_techniques.technique_id into the related roll events
-- CRITICAL: This UPDATE must run AFTER the bjj_roll_events INSERTs above
update public.bjj_roll_events r
set technique_ids = (
  select coalesce(array_agg(st.technique_id order by st.technique_id), '{}')
  from public.bjj_section_techniques st
  where st.section_id = r.section_id
)
where r.section_id in (
  select id from public.bjj_sections
  where workout_id in (
    select id from public.workouts where title like '%Morning rolls%'
      or title like '%Competition prep%'
      or title like '%Open mat%'
      or title like '%Private lesson%'
      or title like '%No-gi%'
      or title like '%Fundamentals%'
      or title like '%sweeps%'
      or title like '%transitions%'
      or title like '%submissions%'
  )
)
and r.technique_ids = '{}';

