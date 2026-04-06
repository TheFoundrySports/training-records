-- Seed data for local development only
-- Creates 2 athlete users and 1 admin, plus sample workouts
--
-- IMPORTANT: Do NOT insert into auth.users directly via SQL — Supabase Auth
-- requires fields like `aud` to be set correctly or login will fail with
-- "invalid_credentials". Use the Admin API instead:
--
--   SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
--   curl -s -X POST "http://127.0.0.1:54321/auth/v1/admin/users" \
--     -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
--     -H "Content-Type: application/json" \
--     -d '{"email":"athlete1@example.com","password":"Password123!","email_confirm":true}'
--
-- Users are created via scripts/seed-users.sh (run once after supabase db reset).
-- Passwords: Password123!
--   athlete1@example.com (role: athlete)
--   athlete2@example.com (role: athlete)
--   admin@example.com    (role: admin)
--
-- After creating users via the Admin API, update the admin profile:
--   UPDATE public.profiles SET role = 'admin'
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@example.com');

-- Sample workouts for athlete1
insert into public.workouts (id, user_id, title, type, performed_at, duration_minutes, rpe, notes)
values
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Morning CrossFit WOD',
    'crossfit',
    now() - interval '1 day',
    45,
    8,
    '5 rounds: 10 pull-ups, 20 push-ups, 30 squats. Felt strong.'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Functional Training Session',
    'functional',
    now() - interval '3 days',
    60,
    7,
    'Focused on mobility and core stability.'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'AMRAP Workout',
    'crossfit',
    now() - interval '5 days',
    30,
    9,
    '15-min AMRAP: 5 deadlifts, 10 box jumps, 15 kettlebell swings.'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Reference data: categories
-- ---------------------------------------------------------------------------
insert into public.categories (id, name, description)
values
  ('cccccccc-0000-0000-0000-000000000001', 'Gymnastics',      'Bodyweight and gymnastics-based movements'),
  ('cccccccc-0000-0000-0000-000000000002', 'Weightlifting',   'Olympic and barbell strength movements'),
  ('cccccccc-0000-0000-0000-000000000003', 'Monostructural',  'Cyclical cardio movements (running, rowing, etc.)'),
  ('cccccccc-0000-0000-0000-000000000004', 'Mixed Modal',     'Workouts combining multiple movement categories')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Reference data: equipment
-- ---------------------------------------------------------------------------
insert into public.equipment (id, name, description)
values
  ('eeeeeeee-0000-0000-0000-000000000001', 'Barbell',         'Standard 20kg barbell'),
  ('eeeeeeee-0000-0000-0000-000000000002', 'Kettlebell',      'Cast iron kettlebell (various weights)'),
  ('eeeeeeee-0000-0000-0000-000000000003', 'Pull-up bar',     'Rig or doorframe pull-up bar'),
  ('eeeeeeee-0000-0000-0000-000000000004', 'Jump rope',       'Speed or standard jump rope'),
  ('eeeeeeee-0000-0000-0000-000000000005', 'Box',             'Plyo box (20"/24"/30")'),
  ('eeeeeeee-0000-0000-0000-000000000006', 'Rowing machine',  'Concept2 or equivalent ergometer')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Reference data: exercises (one per major category)
-- ---------------------------------------------------------------------------
insert into public.exercises (id, name, description, category_id, movement_type, measurement_type, difficulty_level, equipment, is_benchmark)
values
  (
    'ffffffff-0000-0000-0000-000000000001',
    'Pull-up',
    'Strict pull-up from dead hang to chin over bar.',
    'cccccccc-0000-0000-0000-000000000001',
    'gymnastics',
    'reps',
    'intermediate',
    array['eeeeeeee-0000-0000-0000-000000000003']::uuid[],
    true
  ),
  (
    'ffffffff-0000-0000-0000-000000000002',
    'Thruster',
    'Front squat to push press in one fluid movement.',
    'cccccccc-0000-0000-0000-000000000002',
    'weightlifting',
    'weight',
    'intermediate',
    array['eeeeeeee-0000-0000-0000-000000000001']::uuid[],
    true
  ),
  (
    'ffffffff-0000-0000-0000-000000000003',
    'Box Jump',
    'Two-foot takeoff, land on top of box, stand to full extension.',
    'cccccccc-0000-0000-0000-000000000001',
    'gymnastics',
    'reps',
    'beginner',
    array['eeeeeeee-0000-0000-0000-000000000005']::uuid[],
    false
  ),
  (
    'ffffffff-0000-0000-0000-000000000004',
    'Kettlebell Swing',
    'Russian or American KB swing — hip hinge power movement.',
    'cccccccc-0000-0000-0000-000000000002',
    'weightlifting',
    'reps',
    'beginner',
    array['eeeeeeee-0000-0000-0000-000000000002']::uuid[],
    false
  ),
  (
    'ffffffff-0000-0000-0000-000000000005',
    'Double-Under',
    'Jump rope passing under feet twice per jump.',
    'cccccccc-0000-0000-0000-000000000003',
    'monostructural',
    'reps',
    'intermediate',
    array['eeeeeeee-0000-0000-0000-000000000004']::uuid[],
    false
  ),
  (
    'ffffffff-0000-0000-0000-000000000006',
    '400m Run',
    'One lap around a standard track.',
    'cccccccc-0000-0000-0000-000000000003',
    'monostructural',
    'distance',
    'beginner',
    array[]::uuid[],
    false
  ),
  (
    'ffffffff-0000-0000-0000-000000000007',
    'Deadlift',
    'Conventional barbell deadlift from the floor.',
    'cccccccc-0000-0000-0000-000000000002',
    'weightlifting',
    'weight',
    'beginner',
    array['eeeeeeee-0000-0000-0000-000000000001']::uuid[],
    true
  ),
  (
    'ffffffff-0000-0000-0000-000000000008',
    'Push-up',
    'Strict push-up, chest to deck.',
    'cccccccc-0000-0000-0000-000000000001',
    'gymnastics',
    'reps',
    'beginner',
    array[]::uuid[],
    false
  ),
  (
    'ffffffff-0000-0000-0000-000000000009',
    'Air Squat',
    'Bodyweight squat, hip crease below parallel.',
    'cccccccc-0000-0000-0000-000000000001',
    'gymnastics',
    'reps',
    'beginner',
    array[]::uuid[],
    false
  ),
  (
    'ffffffff-0000-0000-0000-000000000010',
    'Row (Calories)',
    'Rowing machine for calorie output.',
    'cccccccc-0000-0000-0000-000000000003',
    'monostructural',
    'calories',
    'beginner',
    array['eeeeeeee-0000-0000-0000-000000000006']::uuid[],
    false
  )
on conflict (id) do nothing;

-- Sample workout for athlete2
insert into public.workouts (id, user_id, title, type, performed_at, duration_minutes, rpe, notes)
values
  (
    'aaaaaaaa-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000002',
    'Athlete 2 - Functional Flow',
    'functional',
    now() - interval '2 days',
    50,
    6,
    'Light session: yoga-inspired movements and band work.'
  )
on conflict (id) do nothing;
