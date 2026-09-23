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

-- Sample workouts for athlete1 (only inserted if the seed user exists)
-- Users are created via scripts/seed-users.sh after supabase db reset.
do $do$
declare
  athlete1_id uuid;
begin
  select id into athlete1_id
  from auth.users
  where email = 'athlete1@example.com'
  limit 1;

  if athlete1_id is not null then
    insert into public.workouts (id, user_id, title, type, performed_at, duration_minutes, rpe, notes)
    values
      (
        'aaaaaaaa-0000-0000-0000-000000000001',
        athlete1_id,
        'Morning CrossFit WOD',
        'crossfit',
        now() - interval '1 day',
        45,
        8,
        '5 rounds: 10 pull-ups, 20 push-ups, 30 squats. Felt strong.'
      ),
      (
        'aaaaaaaa-0000-0000-0000-000000000002',
        athlete1_id,
        'Functional Training Session',
        'functional',
        now() - interval '3 days',
        60,
        7,
        'Focused on mobility and core stability.'
      ),
      (
        'aaaaaaaa-0000-0000-0000-000000000003',
        athlete1_id,
        'AMRAP Workout',
        'crossfit',
        now() - interval '5 days',
        30,
        9,
        '15-min AMRAP: 5 deadlifts, 10 box jumps, 15 kettlebell swings.'
      )
    on conflict (id) do nothing;
  end if;
end $do$;

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
    '788f8cb1-799c-4bcc-9190-2490fb736639',
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
    'b3390331-c6d1-4f45-b913-4dfb83013c9d',
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
    '0d7f07af-9c67-4f0c-a280-c6c9f577318f',
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
    '9fab499e-3629-41d6-a197-6c672c4fd4a7',
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
    'cb5d7471-1519-468d-b4e7-1a28172eb6b7',
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
    '3f040e9e-47fc-4380-a63c-31113a23b826',
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
    '8e64d931-c7aa-444a-a179-331ccbc640b2',
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
    '97b21293-1634-4cb6-8cfe-f3d835d90cec',
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
    '3b50091a-451f-4a55-a66b-b8df21f1a565',
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
    '10d4adf2-dd2c-4440-ba89-e3dee70e55b8',
    'Row (Calories)',
    'Rowing machine for calorie output.',
    'cccccccc-0000-0000-0000-000000000003',
    'monostructural',
    'calories',
    'beginner',
    array['eeeeeeee-0000-0000-0000-000000000006']::uuid[],
    false
  ),
  (
    'b9c0810f-dd7e-4bc1-abef-a5f635579c73',
    'Run',
    'Running at any distance — track, road, or treadmill.',
    'cccccccc-0000-0000-0000-000000000003',
    'monostructural',
    'distance',
    'beginner',
    array[]::uuid[],
    false
  ),
  (
    '511adc06-ca96-4b71-87c9-82563b8f2fe0',
    'Row',
    'Rowing machine for distance or time.',
    'cccccccc-0000-0000-0000-000000000003',
    'monostructural',
    'distance',
    'beginner',
    array['eeeeeeee-0000-0000-0000-000000000006']::uuid[],
    false
  ),
  (
    '28a11eeb-edde-4a59-b5bf-38fb1180a588',
    'Hang Power Clean',
    'Barbell clean from the hang position above the knee.',
    'cccccccc-0000-0000-0000-000000000002',
    'weightlifting',
    'weight',
    'intermediate',
    array['eeeeeeee-0000-0000-0000-000000000001']::uuid[],
    false
  ),
  (
    '08f5503f-1c58-4c8a-9bab-1d9f76886ed6',
    'Push Jerk',
    'Barbell push jerk from the rack or clean position.',
    'cccccccc-0000-0000-0000-000000000002',
    'weightlifting',
    'weight',
    'intermediate',
    array['eeeeeeee-0000-0000-0000-000000000001']::uuid[],
    false
  ),
  (
    '73f1d502-2ede-4619-a87f-a538950adaa7',
    'Clean and Jerk',
    'Full clean followed by a jerk overhead.',
    'cccccccc-0000-0000-0000-000000000002',
    'weightlifting',
    'weight',
    'advanced',
    array['eeeeeeee-0000-0000-0000-000000000001']::uuid[],
    true
  ),
  (
    'bc7dcd1e-60cc-4b0c-98a2-20b69246b886',
    'Power Snatch',
    'Barbell snatch caught above parallel squat.',
    'cccccccc-0000-0000-0000-000000000002',
    'weightlifting',
    'weight',
    'advanced',
    array['eeeeeeee-0000-0000-0000-000000000001']::uuid[],
    false
  ),
  (
    '3fef06c8-0e03-4ac0-a6de-f0b1febf0060',
    'Wall Ball',
    'Squat and throw medicine ball to target.',
    'cccccccc-0000-0000-0000-000000000004',
    'gymnastics',
    'reps',
    'beginner',
    array[]::uuid[],
    false
  ),
  (
    'a2bb5d91-5528-433d-9915-ca31c789a218',
    'Clean',
    'Full squat clean from the floor.',
    'cccccccc-0000-0000-0000-000000000002',
    'weightlifting',
    'weight',
    'intermediate',
    array['eeeeeeee-0000-0000-0000-000000000001']::uuid[],
    false
  ),
  (
    'cca2b5fa-655d-4f6f-854d-4702dc3fb978',
    'Ring Dip',
    'Dip performed on gymnastic rings.',
    'cccccccc-0000-0000-0000-000000000001',
    'gymnastics',
    'reps',
    'intermediate',
    array['eeeeeeee-0000-0000-0000-000000000003']::uuid[],
    false
  ),
  (
    '6c643bf5-7995-4acd-b6c2-3f534a5b47b3',
    'Bench Press',
    'Horizontal barbell press from chest to full arm extension.',
    'cccccccc-0000-0000-0000-000000000002',
    'weightlifting',
    'weight',
    'beginner',
    array[]::uuid[],
    false
  ),
  (
    '415a665a-9778-415c-9187-6054acf4ff6f',
    'Snatch',
    'Full squat snatch — barbell lifted from floor to overhead in one movement.',
    'cccccccc-0000-0000-0000-000000000002',
    'weightlifting',
    'weight',
    'advanced',
    array[]::uuid[],
    false
  ),
  (
    '06412fe3-3426-448f-8d92-8901c3c698c0',
    'Ring Muscle-up',
    'Explosive pull to dip transition on gymnastic rings.',
    'cccccccc-0000-0000-0000-000000000001',
    'gymnastics',
    'reps',
    'advanced',
    array[]::uuid[],
    false
  ),
  (
    '63cc6cb0-cb63-49c8-ab19-7cfab2dc64af',
    'Squat Snatch',
    'Barbell snatch received in a full overhead squat position.',
    'cccccccc-0000-0000-0000-000000000002',
    'weightlifting',
    'weight',
    'advanced',
    array[]::uuid[],
    false
  ),
  (
    '75b04bd3-f4de-4de5-a854-7d662428a27b',
    'Handstand Push-up',
    'Inverted push-up in a handstand position, head to floor.',
    'cccccccc-0000-0000-0000-000000000001',
    'gymnastics',
    'reps',
    'intermediate',
    array[]::uuid[],
    false
  ),
  (
    '74a0d64f-87a1-4140-88d2-44358591ccf2',
    'Overhead Squat',
    'Barbell squat with the bar held overhead in a wide grip.',
    'cccccccc-0000-0000-0000-000000000002',
    'weightlifting',
    'weight',
    'intermediate',
    array[]::uuid[],
    false
  ),
  (
    '810984bc-0d10-4c58-9af6-57ba66845906',
    'Sit-up',
    'Abdominal sit-up, typically with anchored feet.',
    'cccccccc-0000-0000-0000-000000000001',
    'gymnastics',
    'reps',
    'beginner',
    array[]::uuid[],
    false
  ),
  (
    'f7f9698b-836d-409e-a9f7-ece785a5ee45',
    'Echo Bike',
    'Air assault bike for calorie output — arms and legs driven simultaneously.',
    'cccccccc-0000-0000-0000-000000000003',
    'monostructural',
    'calories',
    'beginner',
    array[]::uuid[],
    false
  ),
  (
    '6aa9902d-4767-4234-ae4c-68418b28a03b',
    'Walking Lunge',
    'Forward lunge stepping continuously — knee touches floor each rep.',
    'cccccccc-0000-0000-0000-000000000001',
    'gymnastics',
    'reps',
    'beginner',
    array[]::uuid[],
    false
  ),
  (
    'af83add1-e77d-4610-a4c8-3b4bc845eb37',
    'Dumbbell Snatch',
    'Single-arm dumbbell snatch from the floor to overhead in one movement.',
    'cccccccc-0000-0000-0000-000000000002',
    'weightlifting',
    'weight',
    'intermediate',
    array[]::uuid[],
    false
  ),
  (
    '97819520-ca03-489f-b273-e3a7103cf38d',
    'Toes-to-Bar',
    'Hanging from a pull-up bar, raise toes to touch the bar.',
    'cccccccc-0000-0000-0000-000000000001',
    'gymnastics',
    'reps',
    'intermediate',
    array[]::uuid[],
    false
  ),
  (
    '79128db8-d420-4736-abac-aa775e566252',
    'Bar Muscle-up',
    'Explosive pull-up transitioning above the bar to a dip lockout.',
    'cccccccc-0000-0000-0000-000000000001',
    'gymnastics',
    'reps',
    'advanced',
    array[]::uuid[],
    false
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Reference data: public_wods (37 WODs from oldcode JSON files)
-- Prefixes:
--   bbbbbbbb-... → workouts.json  (workout-01 to workout-20)
--   hhhhhhhh-... → hero-workouts.json (hero-01 to hero-10)
--   dddddddd-... → crossfit-current-wods.json (dd-01 to dd-07)
-- ---------------------------------------------------------------------------
insert into public.public_wods (id, title, type, duration_minutes, wod_format, wod_text, payload, category, created_at)
values

-- ============================================================
-- workouts.json — workout-01 to workout-20
-- workout-1..5: functional (generic fitness)
-- workout-6..20: crossfit (CrossFit benchmark names)
-- ============================================================

-- workout-01: Full Body Strength
(
  'bbbbbbbb-0000-0000-0000-000000000001',
  'Full Body Strength',
  'functional',
  45,
  NULL,
  $$Full Body Strength
A comprehensive full-body workout focusing on building strength and muscle endurance.
- Squats: 3 sets x 15 reps
- Push-ups: 3 sets x 10 reps
- Dumbbell Rows: 3 sets x 12 reps
- Plank: 3 sets x 30 seconds$$,
  NULL,
  'General',
  '2023-10-01T00:00:00Z'
),
-- workout-02: HIIT Cardio Blast
(
  'bbbbbbbb-0000-0000-0000-000000000002',
  'HIIT Cardio Blast',
  'functional',
  30,
  NULL,
  $$HIIT Cardio Blast
High-intensity interval training to improve cardiovascular endurance and burn calories.
- Jumping Jacks: 4 sets x 45 seconds
- Mountain Climbers: 4 sets x 45 seconds
- Burpees: 4 sets x 10 reps
- High Knees: 4 sets x 45 seconds$$,
  NULL,
  'General',
  '2023-10-05T00:00:00Z'
),
-- workout-03: Core Crusher
(
  'bbbbbbbb-0000-0000-0000-000000000003',
  'Core Crusher',
  'functional',
  20,
  NULL,
  $$Core Crusher
Focused abdominal workout to strengthen core muscles.
- Crunches: 3 sets x 20 reps
- Russian Twists: 3 sets x 20 reps
- Leg Raises: 3 sets x 15 reps
- Plank with Shoulder Taps: 3 sets x 20 reps$$,
  NULL,
  'General',
  '2023-10-10T00:00:00Z'
),
-- workout-04: Upper Body Power
(
  'bbbbbbbb-0000-0000-0000-000000000004',
  'Upper Body Power',
  'functional',
  60,
  NULL,
  $$Upper Body Power
Intense upper body workout targeting chest, back, shoulders, and arms.
- Pull-ups: 4 sets x 8 reps
- Bench Press: 4 sets x 8 reps
- Military Press: 4 sets x 8 reps
- Tricep Dips: 4 sets x 10 reps
- Barbell Curls: 4 sets x 10 reps$$,
  NULL,
  'General',
  '2023-10-15T00:00:00Z'
),
-- workout-05: Lower Body Builder
(
  'bbbbbbbb-0000-0000-0000-000000000005',
  'Lower Body Builder',
  'functional',
  50,
  NULL,
  $$Lower Body Builder
Focused leg and glute workout to build strength and size.
- Back Squats: 4 sets x 10 reps
- Romanian Deadlifts: 4 sets x 10 reps
- Walking Lunges: 3 sets x 20 reps
- Leg Press: 3 sets x 12 reps
- Calf Raises: 3 sets x 20 reps$$,
  NULL,
  'General',
  '2023-10-20T00:00:00Z'
),
-- workout-06: CrossFit - Linda
(
  'bbbbbbbb-0000-0000-0000-000000000006',
  'CrossFit - Linda',
  'crossfit',
  40,
  'for_time',
  $$CrossFit - Linda
Also known as "The Three Bars of Death", a CrossFit benchmark workout featuring three barbell movements.
10-9-8-7-6-5-4-3-2-1 reps for time of:
- Deadlift (1.5x bodyweight)
- Bench Press (bodyweight)
- Clean (0.75x bodyweight)$$,
  '{"rounds": 1, "timeCap": 40, "movements": [{"exerciseId": "8e64d931-c7aa-444a-a179-331ccbc640b2", "exerciseName": "Deadlift", "reps": 10, "repScheme": "10-9-8-7-6-5-4-3-2-1", "notes": "10-9-8-7-6-5-4-3-2-1, bodyweight scaling"}, {"exerciseId": "6c643bf5-7995-4acd-b6c2-3f534a5b47b3", "exerciseName": "Bench Press", "reps": 10, "repScheme": "10-9-8-7-6-5-4-3-2-1", "notes": "10-9-8-7-6-5-4-3-2-1, bodyweight scaling"}, {"exerciseId": "a2bb5d91-5528-433d-9915-ca31c789a218", "exerciseName": "Clean", "reps": 10, "repScheme": "10-9-8-7-6-5-4-3-2-1", "notes": "10-9-8-7-6-5-4-3-2-1, bodyweight scaling"}]}',
  'Benchmark',
  '2023-10-21T00:00:00Z'
),
-- workout-07: CrossFit - Jackie
(
  'bbbbbbbb-0000-0000-0000-000000000007',
  'CrossFit - Jackie',
  'crossfit',
  20,
  'for_time',
  $$CrossFit - Jackie
A CrossFit classic combining rowing, thrusters, and pull-ups for time.
For time:
- Row: 1000 meters
- Thrusters: 50 reps (45/35 lb)
- Pull-ups: 30 reps$$,
  '{"rounds": 1, "timeCap": 20, "movements": [{"exerciseId": "511adc06-ca96-4b71-87c9-82563b8f2fe0", "exerciseName": "Row", "reps": 1, "notes": "1000 meters"}, {"exerciseId": "b3390331-c6d1-4f45-b913-4dfb83013c9d", "exerciseName": "Thruster", "reps": 50, "notes": "45/35 lb"}, {"exerciseId": "788f8cb1-799c-4bcc-9190-2490fb736639", "exerciseName": "Pull-up", "reps": 30, "notes": ""}]}',
  'Benchmark',
  '2023-10-22T00:00:00Z'
),
-- workout-08: CrossFit - Isabel
(
  'bbbbbbbb-0000-0000-0000-000000000008',
  'CrossFit - Isabel',
  'crossfit',
  15,
  'for_time',
  $$CrossFit - Isabel
A simple but challenging benchmark of 30 snatches for time.
For time:
- Snatch: 30 reps (135/95 lb)$$,
  '{"rounds": 1, "timeCap": 10, "movements": [{"exerciseId": "415a665a-9778-415c-9187-6054acf4ff6f", "exerciseName": "Snatch", "reps": 30, "notes": "135/95 lb"}]}',
  'Benchmark',
  '2023-10-23T00:00:00Z'
),
-- workout-09: CrossFit - Kelly
(
  'bbbbbbbb-0000-0000-0000-000000000009',
  'CrossFit - Kelly',
  'crossfit',
  30,
  'for_time',
  $$CrossFit - Kelly
A challenging workout with running, box jumps, and wall balls.
5 rounds for time of:
- Run: 400 meters
- Box Jumps: 30 reps (24/20 inches)
- Wall Balls: 30 reps (20/14 lb)$$,
  '{"rounds": 5, "timeCap": 30, "movements": [{"exerciseId": "b9c0810f-dd7e-4bc1-abef-a5f635579c73", "exerciseName": "Run", "reps": 1, "notes": "400 meters"}, {"exerciseId": "0d7f07af-9c67-4f0c-a280-c6c9f577318f", "exerciseName": "Box Jump", "reps": 30, "notes": "24/20 in"}, {"exerciseId": "3fef06c8-0e03-4ac0-a6de-f0b1febf0060", "exerciseName": "Wall Ball", "reps": 30, "notes": "20/14 lb"}]}',
  'Benchmark',
  '2023-10-24T00:00:00Z'
),
-- workout-10: CrossFit - Karen
(
  'bbbbbbbb-0000-0000-0000-000000000010',
  'CrossFit - Karen',
  'crossfit',
  15,
  'for_time',
  $$CrossFit - Karen
A simple but grueling CrossFit workout of 150 wall balls for time.
For time:
- Wall Balls: 150 reps (20/14 lb)$$,
  '{"rounds": 1, "timeCap": 15, "movements": [{"exerciseId": "3fef06c8-0e03-4ac0-a6de-f0b1febf0060", "exerciseName": "Wall Ball", "reps": 150, "notes": "20/14 lb"}]}',
  'Benchmark',
  '2023-10-25T00:00:00Z'
),
-- workout-11: CrossFit - Amanda
(
  'bbbbbbbb-0000-0000-0000-000000000011',
  'CrossFit - Amanda',
  'crossfit',
  25,
  'for_time',
  $$CrossFit - Amanda
A technical workout featuring ring muscle-ups and squat snatches.
9-7-5 reps for time of:
- Ring Muscle-ups
- Squat Snatch (135/95 lb)$$,
  '{"rounds": 1, "timeCap": 25, "movements": [{"exerciseId": "06412fe3-3426-448f-8d92-8901c3c698c0", "exerciseName": "Ring Muscle-up", "reps": 9, "repScheme": "9-7-5", "notes": "9-7-5"}, {"exerciseId": "63cc6cb0-cb63-49c8-ab19-7cfab2dc64af", "exerciseName": "Squat Snatch", "reps": 9, "repScheme": "9-7-5", "notes": "9-7-5, 135/95 lb"}]}',
  'Benchmark',
  '2023-10-26T00:00:00Z'
),
-- workout-12: CrossFit - Diane
(
  'bbbbbbbb-0000-0000-0000-000000000012',
  'CrossFit - Diane',
  'crossfit',
  20,
  'for_time',
  $$CrossFit - Diane
A classic CrossFit workout featuring deadlifts and handstand push-ups.
21-15-9 reps for time of:
- Deadlift (225/155 lb)
- Handstand Push-ups$$,
  '{"rounds": 1, "timeCap": 20, "movements": [{"exerciseId": "8e64d931-c7aa-444a-a179-331ccbc640b2", "exerciseName": "Deadlift", "reps": 21, "repScheme": "21-15-9", "notes": "21-15-9, 225/155 lb"}, {"exerciseId": "75b04bd3-f4de-4de5-a854-7d662428a27b", "exerciseName": "Handstand Push-up", "reps": 21, "repScheme": "21-15-9", "notes": "21-15-9"}]}',
  'Benchmark',
  '2023-10-27T00:00:00Z'
),
-- workout-13: CrossFit - Elizabeth
(
  'bbbbbbbb-0000-0000-0000-000000000013',
  'CrossFit - Elizabeth',
  'crossfit',
  20,
  'for_time',
  $$CrossFit - Elizabeth
A couplet of clean and jerks and ring dips.
21-15-9 reps for time of:
- Clean and Jerk (135/95 lb)
- Ring Dips$$,
  '{"rounds": 1, "timeCap": 20, "movements": [{"exerciseId": "73f1d502-2ede-4619-a87f-a538950adaa7", "exerciseName": "Clean and Jerk", "reps": 21, "repScheme": "21-15-9", "notes": "21-15-9, 135/95 lb"}, {"exerciseId": "cca2b5fa-655d-4f6f-854d-4702dc3fb978", "exerciseName": "Ring Dip", "reps": 21, "repScheme": "21-15-9", "notes": "21-15-9"}]}',
  'Benchmark',
  '2023-10-28T00:00:00Z'
),
-- workout-14: CrossFit - Nancy
(
  'bbbbbbbb-0000-0000-0000-000000000014',
  'CrossFit - Nancy',
  'crossfit',
  25,
  'for_time',
  $$CrossFit - Nancy
A CrossFit workout alternating between running and overhead squats.
5 rounds for time of:
- Run: 400 meters
- Overhead Squats: 15 reps (95/65 lb)$$,
  '{"rounds": 5, "timeCap": 25, "movements": [{"exerciseId": "b9c0810f-dd7e-4bc1-abef-a5f635579c73", "exerciseName": "Run", "reps": 1, "notes": "400 meters"}, {"exerciseId": "74a0d64f-87a1-4140-88d2-44358591ccf2", "exerciseName": "Overhead Squat", "reps": 15, "notes": "95/65 lb"}]}',
  'Benchmark',
  '2023-10-29T00:00:00Z'
),
-- workout-15: CrossFit - Grace
(
  'bbbbbbbb-0000-0000-0000-000000000015',
  'CrossFit - Grace',
  'crossfit',
  15,
  'for_time',
  $$CrossFit - Grace
A CrossFit benchmark workout of 30 clean and jerks for time.
For time:
- Clean and Jerk: 30 reps (135/95 lb)$$,
  '{"rounds": 1, "timeCap": 10, "movements": [{"exerciseId": "73f1d502-2ede-4619-a87f-a538950adaa7", "exerciseName": "Clean and Jerk", "reps": 30, "notes": "135/95 lb"}]}',
  'Benchmark',
  '2023-10-30T00:00:00Z'
),
-- workout-16: CrossFit - Chelsea
(
  'bbbbbbbb-0000-0000-0000-000000000016',
  'CrossFit - Chelsea',
  'crossfit',
  30,
  'emom',
  $$CrossFit - Chelsea
An EMOM workout for 30 minutes featuring pull-ups, push-ups, and squats.
Every minute on the minute for 30 minutes:
- Pull-ups: 5 reps
- Push-ups: 10 reps
- Air Squats: 15 reps$$,
  '{"rounds": 1, "timeCap": 30, "movements": [{"exerciseId": "788f8cb1-799c-4bcc-9190-2490fb736639", "exerciseName": "Pull-up", "reps": 5, "notes": "EMOM 30 min"}, {"exerciseId": "97b21293-1634-4cb6-8cfe-f3d835d90cec", "exerciseName": "Push-up", "reps": 10, "notes": "EMOM 30 min"}, {"exerciseId": "3b50091a-451f-4a55-a66b-b8df21f1a565", "exerciseName": "Air Squat", "reps": 15, "notes": "EMOM 30 min"}]}',
  'Benchmark',
  '2023-10-31T00:00:00Z'
),
-- workout-17: CrossFit - Barbara
(
  'bbbbbbbb-0000-0000-0000-000000000017',
  'CrossFit - Barbara',
  'crossfit',
  40,
  'for_time',
  $$CrossFit - Barbara
Five rounds of a bodyweight circuit with 3-minute rests.
5 rounds for time (3 min rest between rounds):
- Pull-ups: 20 reps
- Push-ups: 30 reps
- Sit-ups: 40 reps
- Air Squats: 50 reps$$,
  '{"rounds": 5, "timeCap": 40, "movements": [{"exerciseId": "788f8cb1-799c-4bcc-9190-2490fb736639", "exerciseName": "Pull-up", "reps": 20, "notes": "3 min rest between rounds"}, {"exerciseId": "97b21293-1634-4cb6-8cfe-f3d835d90cec", "exerciseName": "Push-up", "reps": 30, "notes": ""}, {"exerciseId": "810984bc-0d10-4c58-9af6-57ba66845906", "exerciseName": "Sit-up", "reps": 40, "notes": ""}, {"exerciseId": "3b50091a-451f-4a55-a66b-b8df21f1a565", "exerciseName": "Air Squat", "reps": 50, "notes": ""}]}',
  'Benchmark',
  '2023-11-01T00:00:00Z'
),
-- workout-18: CrossFit - Eva
(
  'bbbbbbbb-0000-0000-0000-000000000018',
  'CrossFit - Eva',
  'crossfit',
  35,
  'for_time',
  $$CrossFit - Eva
A challenging workout with running, kettlebell swings, and pull-ups.
5 rounds for time of:
- Run: 800 meters
- Kettlebell Swings: 30 reps (70/53 lb)
- Pull-ups: 30 reps$$,
  '{"rounds": 5, "timeCap": 35, "movements": [{"exerciseId": "b9c0810f-dd7e-4bc1-abef-a5f635579c73", "exerciseName": "Run", "reps": 1, "notes": "800 meters"}, {"exerciseId": "9fab499e-3629-41d6-a197-6c672c4fd4a7", "exerciseName": "Kettlebell Swing", "reps": 30, "notes": "70/53 lb"}, {"exerciseId": "788f8cb1-799c-4bcc-9190-2490fb736639", "exerciseName": "Pull-up", "reps": 30, "notes": ""}]}',
  'Benchmark',
  '2023-11-02T00:00:00Z'
),
-- workout-19: CrossFit - Annie
(
  'bbbbbbbb-0000-0000-0000-000000000019',
  'CrossFit - Annie',
  'crossfit',
  20,
  'for_time',
  $$CrossFit - Annie
A CrossFit workout alternating between double-unders and sit-ups.
50-40-30-20-10 reps for time of:
- Double-unders
- Sit-ups$$,
  '{"rounds": 1, "timeCap": 20, "movements": [{"exerciseId": "cb5d7471-1519-468d-b4e7-1a28172eb6b7", "exerciseName": "Double-Under", "reps": 50, "repScheme": "50-40-30-20-10", "notes": "50-40-30-20-10"}, {"exerciseId": "810984bc-0d10-4c58-9af6-57ba66845906", "exerciseName": "Sit-up", "reps": 50, "repScheme": "50-40-30-20-10", "notes": "50-40-30-20-10"}]}',
  'Benchmark',
  '2023-11-03T00:00:00Z'
),
-- workout-20: CrossFit - Nicole
(
  'bbbbbbbb-0000-0000-0000-000000000020',
  'CrossFit - Nicole',
  'crossfit',
  20,
  'amrap',
  $$CrossFit - Nicole
An AMRAP workout with running and pull-ups.
As many rounds as possible in 20 minutes of:
- Run: 400 meters
- Max pull-ups$$,
  '{"rounds": 1, "timeCap": 20, "movements": [{"exerciseId": "b9c0810f-dd7e-4bc1-abef-a5f635579c73", "exerciseName": "Run", "reps": 1, "notes": "400 meters"}, {"exerciseId": "788f8cb1-799c-4bcc-9190-2490fb736639", "exerciseName": "Pull-up", "reps": 1, "notes": "max reps"}]}',
  'Benchmark',
  '2023-11-04T00:00:00Z'
),

-- ============================================================
-- hero-workouts.json — hero-01 to hero-10
-- All crossfit; ForTime → for_time, AMRAP → amrap
-- payload: rounds, timeCap (seconds→minutes), movements
-- ============================================================

-- hero-01: Murph
(
  'a0a0a0a0-0000-0000-0000-000000000001',
  'Murph',
  'crossfit',
  60,
  'for_time',
  $$Murph
A classic hero workout dedicated to Navy Lieutenant Michael Murphy.
For time:
- Run: 1 mile
- Pull-ups: 100 reps
- Push-ups: 200 reps
- Air Squats: 300 reps
- Run: 1 mile
Option to wear a 20lb vest or body armor.$$,
  '{"rounds": 1, "timeCap": 60, "movements": [{"exerciseId": "b9c0810f-dd7e-4bc1-abef-a5f635579c73", "exerciseName": "Run", "reps": 1, "notes": "1 mile"}, {"exerciseId": "788f8cb1-799c-4bcc-9190-2490fb736639", "exerciseName": "Pull-ups", "reps": 100, "notes": ""}, {"exerciseId": "97b21293-1634-4cb6-8cfe-f3d835d90cec", "exerciseName": "Push-ups", "reps": 200, "notes": ""}, {"exerciseId": "3b50091a-451f-4a55-a66b-b8df21f1a565", "exerciseName": "Air Squats", "reps": 300, "notes": ""}, {"exerciseId": "b9c0810f-dd7e-4bc1-abef-a5f635579c73", "exerciseName": "Run", "reps": 1, "notes": "1 mile"}]}',
  'Hero',
  '2023-09-01T00:00:00Z'
),
-- hero-02: Fran
(
  'a0a0a0a0-0000-0000-0000-000000000002',
  'Fran',
  'crossfit',
  10,
  'for_time',
  $$Fran
One of the most famous CrossFit benchmark workouts, a couplet of thrusters and pull-ups.
21-15-9 reps for time of:
- Thrusters (95/65 lb)
- Pull-ups$$,
  '{"rounds": 1, "timeCap": 10, "movements": [{"exerciseId": "b3390331-c6d1-4f45-b913-4dfb83013c9d", "exerciseName": "Thrusters", "reps": 21, "repScheme": "21-15-9", "notes": "21-15-9, 95/65 lb"}, {"exerciseId": "788f8cb1-799c-4bcc-9190-2490fb736639", "exerciseName": "Pull-ups", "reps": 21, "repScheme": "21-15-9", "notes": "21-15-9"}]}',
  'Girl',
  '2023-09-05T00:00:00Z'
),
-- hero-03: Cindy
(
  'a0a0a0a0-0000-0000-0000-000000000003',
  'Cindy',
  'crossfit',
  20,
  'amrap',
  $$Cindy
A simple but challenging AMRAP of pull-ups, push-ups, and squats.
As many rounds as possible in 20 minutes of:
- Pull-ups: 5 reps
- Push-ups: 10 reps
- Air Squats: 15 reps$$,
  '{"rounds": 1, "timeCap": 20, "movements": [{"exerciseId": "788f8cb1-799c-4bcc-9190-2490fb736639", "exerciseName": "Pull-ups", "reps": 5, "notes": ""}, {"exerciseId": "97b21293-1634-4cb6-8cfe-f3d835d90cec", "exerciseName": "Push-ups", "reps": 10, "notes": ""}, {"exerciseId": "3b50091a-451f-4a55-a66b-b8df21f1a565", "exerciseName": "Air Squats", "reps": 15, "notes": ""}]}',
  'Girl',
  '2023-09-10T00:00:00Z'
),
-- hero-04: DT (5 rounds)
(
  'a0a0a0a0-0000-0000-0000-000000000004',
  'DT',
  'crossfit',
  20,
  'for_time',
  $$DT
A hero WOD honoring USAF SSgt Timothy P. Davis, killed in Afghanistan in 2009.
5 rounds for time of:
- Deadlift: 12 reps (155/105 lb)
- Hang Power Clean: 9 reps (155/105 lb)
- Push Jerk: 6 reps (155/105 lb)$$,
  '{"rounds": 5, "timeCap": 20, "movements": [{"exerciseId": "8e64d931-c7aa-444a-a179-331ccbc640b2", "exerciseName": "Deadlift", "reps": 12, "notes": "155/105 lb"}, {"exerciseId": "28a11eeb-edde-4a59-b5bf-38fb1180a588", "exerciseName": "Hang Power Clean", "reps": 9, "notes": "155/105 lb"}, {"exerciseId": "08f5503f-1c58-4c8a-9bab-1d9f76886ed6", "exerciseName": "Push Jerk", "reps": 6, "notes": "155/105 lb"}]}',
  'Hero',
  '2023-09-15T00:00:00Z'
),
-- hero-05: Helen (3 rounds)
(
  'a0a0a0a0-0000-0000-0000-000000000005',
  'Helen',
  'crossfit',
  15,
  'for_time',
  $$Helen
A classic Girl WOD combining running, kettlebell swings, and pull-ups.
3 rounds for time of:
- Run: 400 meters
- Kettlebell Swings: 21 reps (53/35 lb)
- Pull-ups: 12 reps$$,
  '{"rounds": 3, "timeCap": 15, "movements": [{"exerciseId": "b9c0810f-dd7e-4bc1-abef-a5f635579c73", "exerciseName": "Run", "reps": 1, "notes": "400 meters"}, {"exerciseId": "9fab499e-3629-41d6-a197-6c672c4fd4a7", "exerciseName": "Kettlebell Swings", "reps": 21, "notes": "53/35 lb"}, {"exerciseId": "788f8cb1-799c-4bcc-9190-2490fb736639", "exerciseName": "Pull-ups", "reps": 12, "notes": ""}]}',
  'Girl',
  '2023-09-20T00:00:00Z'
),
-- hero-06: Grace
(
  'a0a0a0a0-0000-0000-0000-000000000006',
  'Grace',
  'crossfit',
  10,
  'for_time',
  $$Grace
Complete 30 clean and jerks for time.
For time:
- Clean and Jerk: 30 reps (135/95 lb)$$,
  '{"rounds": 1, "timeCap": 10, "movements": [{"exerciseId": "73f1d502-2ede-4619-a87f-a538950adaa7", "exerciseName": "Clean and Jerk", "reps": 30, "notes": "135/95 lb"}]}',
  'Girl',
  '2023-10-01T00:00:00Z'
),
-- hero-07: Isabel
(
  'a0a0a0a0-0000-0000-0000-000000000007',
  'Isabel',
  'crossfit',
  10,
  'for_time',
  $$Isabel
Complete 30 snatches for time.
For time:
- Power Snatch: 30 reps (135/95 lb)$$,
  '{"rounds": 1, "timeCap": 10, "movements": [{"exerciseId": "bc7dcd1e-60cc-4b0c-98a2-20b69246b886", "exerciseName": "Power Snatch", "reps": 30, "notes": "135/95 lb"}]}',
  'Girl',
  '2023-10-05T00:00:00Z'
),
-- hero-08: Karen
(
  'a0a0a0a0-0000-0000-0000-000000000008',
  'Karen',
  'crossfit',
  15,
  'for_time',
  $$Karen
Complete 150 wall-ball shots for time.
For time:
- Wall Ball: 150 reps (20/14 lb to 10\'/9\' target)$$,
  '{"rounds": 1, "timeCap": 15, "movements": [{"exerciseId": "3fef06c8-0e03-4ac0-a6de-f0b1febf0060", "exerciseName": "Wall Ball", "reps": 150, "notes": "20/14 lb"}]}',
  'Girl',
  '2023-10-10T00:00:00Z'
),
-- hero-09: Elizabeth
(
  'a0a0a0a0-0000-0000-0000-000000000009',
  'Elizabeth',
  'crossfit',
  15,
  'for_time',
  $$Elizabeth
Complete 21-15-9 reps of cleans and ring dips for time.
21-15-9 reps for time of:
- Clean (135/95 lb)
- Ring Dip$$,
  '{"rounds": 1, "timeCap": 15, "movements": [{"exerciseId": "a2bb5d91-5528-433d-9915-ca31c789a218", "exerciseName": "Clean", "reps": 21, "repScheme": "21-15-9", "notes": "21-15-9, 135/95 lb"}, {"exerciseId": "cca2b5fa-655d-4f6f-854d-4702dc3fb978", "exerciseName": "Ring Dip", "reps": 21, "repScheme": "21-15-9", "notes": "21-15-9"}]}',
  'Girl',
  '2023-10-15T00:00:00Z'
),
-- hero-10: Jackie
(
  'a0a0a0a0-0000-0000-0000-000000000010',
  'Jackie',
  'crossfit',
  15,
  'for_time',
  $$Jackie
For time: 1,000m row, 50 thrusters, 30 pull-ups.
For time:
- Row: 1000 meters
- Thrusters: 50 reps (45/35 lb)
- Pull-ups: 30 reps$$,
  '{"rounds": 1, "timeCap": 15, "movements": [{"exerciseId": "511adc06-ca96-4b71-87c9-82563b8f2fe0", "exerciseName": "Row", "reps": 1, "notes": "1000 meters"}, {"exerciseId": "b3390331-c6d1-4f45-b913-4dfb83013c9d", "exerciseName": "Thrusters", "reps": 50, "notes": "45/35 lb"}, {"exerciseId": "788f8cb1-799c-4bcc-9190-2490fb736639", "exerciseName": "Pull-ups", "reps": 30, "notes": ""}]}',
  'Girl',
  '2023-10-20T00:00:00Z'
),

-- ============================================================
-- crossfit-current-wods.json — dd-01 to dd-07
-- All crossfit, wod_format NULL
-- ============================================================

-- dd-01: CrossFit - Cindy (250509) — has "CrossFit" → Benchmark
(
  'b0b0b0b0-0000-0000-0000-000000000001',
  'CrossFit - Cindy (250509)',
  'crossfit',
  20,
  'amrap',
  $$CrossFit - Cindy (250509)
A classic benchmark, perfect preparation for Murph with pull-ups, push-ups, and air squats.
As many rounds as possible in 20 minutes of:
- Pull-ups: 5 reps
- Push-ups: 10 reps
- Air Squats: 15 reps$$,
  '{"rounds": 1, "timeCap": 20, "movements": [{"exerciseId": "788f8cb1-799c-4bcc-9190-2490fb736639", "exerciseName": "Pull-up", "reps": 5, "notes": ""}, {"exerciseId": "97b21293-1634-4cb6-8cfe-f3d835d90cec", "exerciseName": "Push-up", "reps": 10, "notes": ""}, {"exerciseId": "3b50091a-451f-4a55-a66b-b8df21f1a565", "exerciseName": "Air Squat", "reps": 15, "notes": ""}]}',
  'Benchmark',
  '2024-05-09T00:00:00Z'
),
-- dd-02: Box Jumps & Echo Bike (250507)
(
  'b0b0b0b0-0000-0000-0000-000000000002',
  'Box Jumps & Echo Bike (250507)',
  'crossfit',
  20,
  'emom',
  $$Box Jumps & Echo Bike (250507)
EMOM alternating between box jumps and Echo bike calories.
Every minute on the minute for 20 minutes (alternating):
- Box Jumps: 12 reps (24/20 inch)
- Echo Bike: 12 calories$$,
  '{"rounds": 1, "timeCap": 20, "movements": [{"exerciseId": "0d7f07af-9c67-4f0c-a280-c6c9f577318f", "exerciseName": "Box Jump", "reps": 12, "notes": "24/20 inch, odd minutes"}, {"exerciseId": "f7f9698b-836d-409e-a9f7-ece785a5ee45", "exerciseName": "Echo Bike", "reps": 12, "notes": "calories, even minutes"}]}',
  'General',
  '2024-05-07T00:00:00Z'
),
-- dd-03: Static Hold Challenge (250512)
(
  'b0b0b0b0-0000-0000-0000-000000000003',
  'Static Hold Challenge (250512)',
  'crossfit',
  20,
  'for_time',
  $$Static Hold Challenge (250512)
A unique effort focusing on static holds to challenge muscle stamina and mental fortitude.
- Handstand Hold: 30 seconds
- Squat Hold: 30 seconds (bottom position)
- L-sit Hold: 30 seconds
- Chin-over-bar Hold: 30 seconds$$,
  NULL,
  'General',
  '2024-05-12T00:00:00Z'
),
-- dd-04: Power Snatch & Row (250510)
(
  'b0b0b0b0-0000-0000-0000-000000000004',
  'Power Snatch & Row (250510)',
  'crossfit',
  25,
  'rft',
  $$Power Snatch & Row (250510)
5 rounds of power snatches and rowing with rest intervals.
5 rounds:
- Power Snatch: 5 reps (weight of choice)
- Row: 400/500 meters$$,
  '{"rounds": 5, "timeCap": 25, "movements": [{"exerciseId": "bc7dcd1e-60cc-4b0c-98a2-20b69246b886", "exerciseName": "Power Snatch", "reps": 5, "notes": "weight of choice"}, {"exerciseId": "511adc06-ca96-4b71-87c9-82563b8f2fe0", "exerciseName": "Row", "reps": 1, "notes": "400/500 meters"}]}',
  'General',
  '2024-05-10T00:00:00Z'
),
-- dd-05: Run & Walking Lunge Challenge (250414)
(
  'b0b0b0b0-0000-0000-0000-000000000005',
  'Run & Walking Lunge Challenge (250414)',
  'crossfit',
  20,
  'rft',
  $$Run & Walking Lunge Challenge (250414)
5 rounds of running and walking lunges for full leg conditioning.
5 rounds:
- Run: 350 meters
- Walking Lunge: 50 meters$$,
  '{"rounds": 5, "timeCap": 20, "movements": [{"exerciseId": "b9c0810f-dd7e-4bc1-abef-a5f635579c73", "exerciseName": "Run", "reps": 1, "notes": "350 meters"}, {"exerciseId": "6aa9902d-4767-4234-ae4c-68418b28a03b", "exerciseName": "Walking Lunge", "reps": 50, "notes": "50 meters"}]}',
  'General',
  '2024-04-14T00:00:00Z'
),
-- dd-06: Push-up, DB Snatch & TTB Challenge (250415)
(
  'b0b0b0b0-0000-0000-0000-000000000006',
  'Push-up, DB Snatch & TTB Challenge (250415)',
  'crossfit',
  10,
  'amrap',
  $$Push-up, DB Snatch & TTB Challenge (250415)
A 10-minute AMRAP combining push-ups, dumbbell snatches, and toes-to-bars.
As many rounds as possible in 10 minutes of:
- Push-ups: 10 reps
- Dumbbell Snatch (Right): 10 reps (35/50 lb)
- Toes-to-bar: 10 reps
- Dumbbell Snatch (Left): 10 reps (35/50 lb)$$,
  '{"rounds": 1, "timeCap": 10, "movements": [{"exerciseId": "97b21293-1634-4cb6-8cfe-f3d835d90cec", "exerciseName": "Push-up", "reps": 10, "notes": ""}, {"exerciseId": "af83add1-e77d-4610-a4c8-3b4bc845eb37", "exerciseName": "Dumbbell Snatch", "reps": 10, "notes": "35/50 lb right"}, {"exerciseId": "97819520-ca03-489f-b273-e3a7103cf38d", "exerciseName": "Toes-to-Bar", "reps": 10, "notes": ""}, {"exerciseId": "af83add1-e77d-4610-a4c8-3b4bc845eb37", "exerciseName": "Dumbbell Snatch", "reps": 10, "notes": "35/50 lb left"}]}',
  'General',
  '2024-04-15T00:00:00Z'
),
-- dd-07: Double-Under, Row & Bar Muscle-Up Challenge (250412)
(
  'b0b0b0b0-0000-0000-0000-000000000007',
  'Double-Under, Row & Bar Muscle-Up Challenge (250412)',
  'crossfit',
  30,
  'for_time',
  $$Double-Under, Row & Bar Muscle-Up Challenge (250412)
A descending rep scheme triplet testing gymnastics and endurance.
For time (descending scheme):
Round 1: 150 Double-unders, 45 Cal Row, 15 Bar Muscle-ups
Round 2: 120 Double-unders, 36 Cal Row, 12 Bar Muscle-ups
Round 3: 90 Double-unders, 27 Cal Row, 9 Bar Muscle-ups$$,
  '{"rounds": 3, "timeCap": 30, "movements": [{"exerciseId": "cb5d7471-1519-468d-b4e7-1a28172eb6b7", "exerciseName": "Double-Under", "reps": 150, "repScheme": "150-120-90", "notes": "150-120-90 descending"}, {"exerciseId": "10d4adf2-dd2c-4440-ba89-e3dee70e55b8", "exerciseName": "Row (Calories)", "reps": 45, "repScheme": "45-36-27", "notes": "45-36-27 descending"}, {"exerciseId": "79128db8-d420-4736-abac-aa775e566252", "exerciseName": "Bar Muscle-up", "reps": 15, "repScheme": "15-12-9", "notes": "15-12-9 descending"}]}',
  'General',
  '2024-04-12T00:00:00Z'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- AI Settings (single-row, always use id 00000000-0000-0000-0000-000000000001)
-- ---------------------------------------------------------------------------
insert into public.ai_settings (id, provider_name, base_url, model)
values ('00000000-0000-0000-0000-000000000001', 'minimax', 'https://api.minimax.io/v1', 'MiniMax-M3')
on conflict (id) do update set
  provider_name = EXCLUDED.provider_name,
  base_url      = EXCLUDED.base_url,
  model        = EXCLUDED.model;

-- ---------------------------------------------------------------------------
-- Reference data: bjj_techniques
-- ---------------------------------------------------------------------------
insert into public.bjj_techniques (name, name_es, description, category)
values
  -- Takedowns
  ('Double Leg Takedown',    'Derribo por las dos piernas',   'Impulsarse con ambas piernas para llevar al oponente al suelo.',                                  'takedown'),
  ('Single Leg Takedown',    'Derribo por una pierna',        'Asegurar una pierna y finalizar el derribo empujando hacia adelante o levantando.',               'takedown'),
  ('Collar Drag',            'Arrastre de solapa',            'Usar el agarre de solapa o manga para desequilibrar al oponente y pasarlo de largo.',             'takedown'),
  ('Arm Drag',               'Arrastre de brazo',             'Arrastrar el brazo del oponente a través de su cuerpo para tomar la espalda o entrar en derribo.','takedown'),
  ('Guard Pull',             'Jalón de guardia',              'Jalar guardia deliberadamente para llevar el combate al suelo en tus propios términos.',          'takedown'),
  -- Guard passes
  ('Closed Guard Break',     'Apertura de guardia cerrada',   'Usar la postura y presión de cadera para abrir la guardia cerrada antes de pasarla.',            'guard_pass'),
  ('Knee Slide Pass',        'Paso en deslizamiento',        'Deslizar la rodilla a través de la guardia controlando la cadera para aplanar al oponente.',     'guard_pass'),
  ('Leg Weave Pass',         'Paso tejido de pierna',        'Tejer la rodilla entre las piernas del oponente para establecer presión y pasar la guardia.',    'guard_pass'),
  ('Double Under Pass',       'Paso doble por debajo',         'Pasar ambos brazos por debajo de las piernas del oponente y apilar para pasar.',                 'guard_pass'),
  ('Leg Drag Pass',          'Arrastre de pierna',           'Arrastrar una pierna al tatami y usar presión de hombro para establecer control lateral.',       'guard_pass'),
  ('Toreando Pass',          'Paso toreo',                   'Controlar ambos tobillos y moverse lateralmente para pasar sin comprometer el peso.',            'guard_pass'),
  -- Guard retention & guard types
  ('Basic Guard Retention',   'Retención básica de guardia',   'Usar marcos, camarón y movimiento de cadera para evitar el pase y recuperar la guardia.',        'guard'),
  ('Collar and Sleeve Guard', 'Guardia de solapa y manga',    'Controlar solapa y manga para manejar la distancia y atacar con barridas y sometimientos.',      'guard'),
  ('De La Riva Guard',       'Guardia De La Riva',            'Enrollar una pierna por fuera de la pierna del oponente para controlar la postura y barrer.',    'guard'),
  ('Spider Guard',           'Guardia araña',                 'Controlar ambas mangas con los pies en los bíceps para desequilibrar y barrer.',                 'guard'),
  ('Lasso Guard',            'Guardia lazo',                  'Pasar un brazo por la manga del oponente y enrollar la pierna para crear palanca.',              'guard'),
  ('Butterfly Guard',        'Guardia mariposa',               'Enganchar ambos pies dentro de los muslos del oponente para elevar y barrer.',                   'guard'),
  ('Half Guard',             'Media guardia',                  'Controlar una pierna entre las propias para evitar el pase y preparar barridas.',                'guard'),
  ('Closed Guard',           'Guardia cerrada',               'Cerrar ambas piernas alrededor de la cintura del oponente para controlar la postura y atacar.', 'guard'),
  ('X Guard',                'Guardia X',                     'Insertarse bajo el oponente con dos ganchos en una pierna para desequilibrar y barrer.',         'guard'),
  ('Single Leg X Guard',     'Guardia X por una pierna',      'Controlar una pierna con un gancho en cuatro para barrer o transicionar a candados de pierna.', 'guard'),
  -- Submissions
  ('Triangle Choke',         'Estrangulación triángulo',      'Usar las piernas para crear un cuatro alrededor del cuello y brazo del oponente y ahogar.',     'submission'),
  ('Armbar',                 'Llave de codo',                 'Hiperextender el codo del oponente usando las caderas como punto de apoyo.',                     'submission'),
  ('Kimura',                 'Kimura',                        'Llave de hombro usando un agarre en cuatro sobre la muñeca del oponente.',                      'submission'),
  ('Omoplata',               'Omoplata',                      'Llave de hombro usando la pierna para rotar el brazo del oponente detrás de su espalda.',       'submission'),
  ('Cross Collar Choke',     'Estrangulación de solapa',      'Insertar ambos pulgares en las solapas opuestas y ahogar desde la guardia cerrada.',            'submission'),
  ('Rear Naked Choke',       'Estrangulación dorsal',          'Estrangulamiento sanguíneo aplicado desde la espalda usando el antebrazo sobre la garganta.',   'submission'),
  ('Straight Ankle Lock',     'Llave de tobillo',              'Controlar el pie y aplicar presión sobre el tendón de Aquiles con el antebrazo.',               'submission'),
  -- Escapes
  ('Mount Escape',           'Escape de monte',               'Usar el puente-y-volteo o escape codo-rodilla para recuperar guardia desde el monte inferior.', 'escape'),
  ('Side Control Escape',    'Escape de control lateral',     'Usar marcos y camarón para recuperar la guardia desde el control lateral inferior.',             'escape'),
  ('Back Escape',            'Escape de espalda',             'Girarse hacia el oponente y recuperar guardia o tomar posición superior desde el control de espalda.','escape'),
  ('Triangle Escape',        'Escape de triángulo',           'Mejorar la postura, apilar o usar la mecánica del autoestopista para escapar un triángulo.',    'escape'),
  ('Guillotine Escape',      'Escape de guillotina',           'Sacar la cabeza o tomar la espalda para aliviar la presión de una guillotina.',                 'escape'),
  ('Armbar Escape',          'Escape de llave de codo',       'Apilar, autoestopista o rodar para escapar antes de que se alcance la extensión completa.',     'escape'),
  -- Transitions
  ('Guard Recovery',         'Recuperación de guardia',       'Retornar a la guardia desde una posición inferior usando camarón y reencuadre.',                  'transition'),
  ('Scramble to Top',        'Pelea hacia arriba',           'Recuperar posición superior desde una posición neutral o inferior durante una pelea.',           'transition'),
  ('Back Take',              'Toma de espalda',              'Tomar el control de la espalda del oponente desde guardia, control lateral o durante derribo.',  'transition'),
  ('Sweep to Mount',         'Barrida a monte',              'Barrer al oponente desde la guardia cerrada o abierta y montar directamente.',                   'transition'),
  -- Other
  ('Positional Reset',       'Reinicio posicional',          'Reanudar desde una posición específica después de que la acción se detenga.',                     'other'),
  ('Stand-up Defense',       'Defensa de pie',               'Volver a ponerse de pie desde la posición inferior.',                                            'other'),
  ('Grip Fighting',          'Pelea de agarres',             'Controlar y romper agarres del oponente para dictar la dinámica del combate.',                  'other')
on conflict (name) do update set name_es = excluded.name_es;

-- Sample workout for athlete2 (only inserted if the seed user exists)
do $do$
begin
  if exists (select 1 from auth.users where id = '00000000-0000-0000-0000-000000000002') then
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
  end if;
end $do$;
