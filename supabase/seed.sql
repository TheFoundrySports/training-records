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
  E'Full Body Strength\nA comprehensive full-body workout focusing on building strength and muscle endurance.\n- Squats: 3 sets x 15 reps\n- Push-ups: 3 sets x 10 reps\n- Dumbbell Rows: 3 sets x 12 reps\n- Plank: 3 sets x 30 seconds',
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
  E'HIIT Cardio Blast\nHigh-intensity interval training to improve cardiovascular endurance and burn calories.\n- Jumping Jacks: 4 sets x 45 seconds\n- Mountain Climbers: 4 sets x 45 seconds\n- Burpees: 4 sets x 10 reps\n- High Knees: 4 sets x 45 seconds',
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
  E'Core Crusher\nFocused abdominal workout to strengthen core muscles.\n- Crunches: 3 sets x 20 reps\n- Russian Twists: 3 sets x 20 reps\n- Leg Raises: 3 sets x 15 reps\n- Plank with Shoulder Taps: 3 sets x 20 reps',
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
  E'Upper Body Power\nIntense upper body workout targeting chest, back, shoulders, and arms.\n- Pull-ups: 4 sets x 8 reps\n- Bench Press: 4 sets x 8 reps\n- Military Press: 4 sets x 8 reps\n- Tricep Dips: 4 sets x 10 reps\n- Barbell Curls: 4 sets x 10 reps',
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
  E'Lower Body Builder\nFocused leg and glute workout to build strength and size.\n- Back Squats: 4 sets x 10 reps\n- Romanian Deadlifts: 4 sets x 10 reps\n- Walking Lunges: 3 sets x 20 reps\n- Leg Press: 3 sets x 12 reps\n- Calf Raises: 3 sets x 20 reps',
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
  NULL,
  E'CrossFit - Linda\nAlso known as "The Three Bars of Death", a CrossFit benchmark workout featuring three barbell movements.\n10-9-8-7-6-5-4-3-2-1 reps for time of:\n- Deadlift (1.5x bodyweight)\n- Bench Press (bodyweight)\n- Clean (0.75x bodyweight)',
  NULL,
  'Benchmark',
  '2023-10-21T00:00:00Z'
),
-- workout-07: CrossFit - Jackie
(
  'bbbbbbbb-0000-0000-0000-000000000007',
  'CrossFit - Jackie',
  'crossfit',
  20,
  NULL,
  E'CrossFit - Jackie\nA CrossFit classic combining rowing, thrusters, and pull-ups for time.\nFor time:\n- Row: 1000 meters\n- Thrusters: 50 reps (45/35 lb)\n- Pull-ups: 30 reps',
  NULL,
  'Benchmark',
  '2023-10-22T00:00:00Z'
),
-- workout-08: CrossFit - Isabel
(
  'bbbbbbbb-0000-0000-0000-000000000008',
  'CrossFit - Isabel',
  'crossfit',
  15,
  NULL,
  E'CrossFit - Isabel\nA simple but challenging benchmark of 30 snatches for time.\nFor time:\n- Snatch: 30 reps (135/95 lb)',
  NULL,
  'Benchmark',
  '2023-10-23T00:00:00Z'
),
-- workout-09: CrossFit - Kelly
(
  'bbbbbbbb-0000-0000-0000-000000000009',
  'CrossFit - Kelly',
  'crossfit',
  30,
  NULL,
  E'CrossFit - Kelly\nA challenging workout with running, box jumps, and wall balls.\n5 rounds for time of:\n- Run: 400 meters\n- Box Jumps: 30 reps (24/20 inches)\n- Wall Balls: 30 reps (20/14 lb)',
  NULL,
  'Benchmark',
  '2023-10-24T00:00:00Z'
),
-- workout-10: CrossFit - Karen
(
  'bbbbbbbb-0000-0000-0000-000000000010',
  'CrossFit - Karen',
  'crossfit',
  15,
  NULL,
  E'CrossFit - Karen\nA simple but grueling CrossFit workout of 150 wall balls for time.\nFor time:\n- Wall Balls: 150 reps (20/14 lb)',
  NULL,
  'Benchmark',
  '2023-10-25T00:00:00Z'
),
-- workout-11: CrossFit - Amanda
(
  'bbbbbbbb-0000-0000-0000-000000000011',
  'CrossFit - Amanda',
  'crossfit',
  25,
  NULL,
  E'CrossFit - Amanda\nA technical workout featuring ring muscle-ups and squat snatches.\n9-7-5 reps for time of:\n- Ring Muscle-ups\n- Squat Snatch (135/95 lb)',
  NULL,
  'Benchmark',
  '2023-10-26T00:00:00Z'
),
-- workout-12: CrossFit - Diane
(
  'bbbbbbbb-0000-0000-0000-000000000012',
  'CrossFit - Diane',
  'crossfit',
  20,
  NULL,
  E'CrossFit - Diane\nA classic CrossFit workout featuring deadlifts and handstand push-ups.\n21-15-9 reps for time of:\n- Deadlift (225/155 lb)\n- Handstand Push-ups',
  NULL,
  'Benchmark',
  '2023-10-27T00:00:00Z'
),
-- workout-13: CrossFit - Elizabeth
(
  'bbbbbbbb-0000-0000-0000-000000000013',
  'CrossFit - Elizabeth',
  'crossfit',
  20,
  NULL,
  E'CrossFit - Elizabeth\nA couplet of clean and jerks and ring dips.\n21-15-9 reps for time of:\n- Clean and Jerk (135/95 lb)\n- Ring Dips',
  NULL,
  'Benchmark',
  '2023-10-28T00:00:00Z'
),
-- workout-14: CrossFit - Nancy
(
  'bbbbbbbb-0000-0000-0000-000000000014',
  'CrossFit - Nancy',
  'crossfit',
  25,
  NULL,
  E'CrossFit - Nancy\nA CrossFit workout alternating between running and overhead squats.\n5 rounds for time of:\n- Run: 400 meters\n- Overhead Squats: 15 reps (95/65 lb)',
  NULL,
  'Benchmark',
  '2023-10-29T00:00:00Z'
),
-- workout-15: CrossFit - Grace
(
  'bbbbbbbb-0000-0000-0000-000000000015',
  'CrossFit - Grace',
  'crossfit',
  15,
  NULL,
  E'CrossFit - Grace\nA CrossFit benchmark workout of 30 clean and jerks for time.\nFor time:\n- Clean and Jerk: 30 reps (135/95 lb)',
  NULL,
  'Benchmark',
  '2023-10-30T00:00:00Z'
),
-- workout-16: CrossFit - Chelsea
(
  'bbbbbbbb-0000-0000-0000-000000000016',
  'CrossFit - Chelsea',
  'crossfit',
  30,
  NULL,
  E'CrossFit - Chelsea\nAn EMOM workout for 30 minutes featuring pull-ups, push-ups, and squats.\nEvery minute on the minute for 30 minutes:\n- Pull-ups: 5 reps\n- Push-ups: 10 reps\n- Air Squats: 15 reps',
  NULL,
  'Benchmark',
  '2023-10-31T00:00:00Z'
),
-- workout-17: CrossFit - Barbara
(
  'bbbbbbbb-0000-0000-0000-000000000017',
  'CrossFit - Barbara',
  'crossfit',
  40,
  NULL,
  E'CrossFit - Barbara\nFive rounds of a bodyweight circuit with 3-minute rests.\n5 rounds for time (3 min rest between rounds):\n- Pull-ups: 20 reps\n- Push-ups: 30 reps\n- Sit-ups: 40 reps\n- Air Squats: 50 reps',
  NULL,
  'Benchmark',
  '2023-11-01T00:00:00Z'
),
-- workout-18: CrossFit - Eva
(
  'bbbbbbbb-0000-0000-0000-000000000018',
  'CrossFit - Eva',
  'crossfit',
  35,
  NULL,
  E'CrossFit - Eva\nA challenging workout with running, kettlebell swings, and pull-ups.\n5 rounds for time of:\n- Run: 800 meters\n- Kettlebell Swings: 30 reps (70/53 lb)\n- Pull-ups: 30 reps',
  NULL,
  'Benchmark',
  '2023-11-02T00:00:00Z'
),
-- workout-19: CrossFit - Annie
(
  'bbbbbbbb-0000-0000-0000-000000000019',
  'CrossFit - Annie',
  'crossfit',
  20,
  NULL,
  E'CrossFit - Annie\nA CrossFit workout alternating between double-unders and sit-ups.\n50-40-30-20-10 reps for time of:\n- Double-unders\n- Sit-ups',
  NULL,
  'Benchmark',
  '2023-11-03T00:00:00Z'
),
-- workout-20: CrossFit - Nicole
(
  'bbbbbbbb-0000-0000-0000-000000000020',
  'CrossFit - Nicole',
  'crossfit',
  20,
  NULL,
  E'CrossFit - Nicole\nAn AMRAP workout with running and pull-ups.\nAs many rounds as possible in 20 minutes of:\n- Run: 400 meters\n- Max pull-ups',
  NULL,
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
  'hhhhhhhh-0000-0000-0000-000000000001',
  'Murph',
  'crossfit',
  60,
  'for_time',
  E'Murph\nA classic hero workout dedicated to Navy Lieutenant Michael Murphy.\nFor time:\n- Run: 1 mile\n- Pull-ups: 100 reps\n- Push-ups: 200 reps\n- Air Squats: 300 reps\n- Run: 1 mile\nOption to wear a 20lb vest or body armor.',
  '{"rounds": 1, "timeCap": 60, "movements": [{"exerciseId": "", "exerciseName": "Run", "reps": 1, "notes": "1 mile"}, {"exerciseId": "", "exerciseName": "Pull-ups", "reps": 100, "notes": ""}, {"exerciseId": "", "exerciseName": "Push-ups", "reps": 200, "notes": ""}, {"exerciseId": "", "exerciseName": "Air Squats", "reps": 300, "notes": ""}, {"exerciseId": "", "exerciseName": "Run", "reps": 1, "notes": "1 mile"}]}',
  'Hero',
  '2023-09-01T00:00:00Z'
),
-- hero-02: Fran
(
  'hhhhhhhh-0000-0000-0000-000000000002',
  'Fran',
  'crossfit',
  10,
  'for_time',
  E'Fran\nOne of the most famous CrossFit benchmark workouts, a couplet of thrusters and pull-ups.\n21-15-9 reps for time of:\n- Thrusters (95/65 lb)\n- Pull-ups',
  '{"rounds": 1, "timeCap": 10, "movements": [{"exerciseId": "", "exerciseName": "Thrusters", "reps": 21, "notes": "21-15-9, 95/65 lb"}, {"exerciseId": "", "exerciseName": "Pull-ups", "reps": 21, "notes": "21-15-9"}]}',
  'Girl',
  '2023-09-05T00:00:00Z'
),
-- hero-03: Cindy
(
  'hhhhhhhh-0000-0000-0000-000000000003',
  'Cindy',
  'crossfit',
  20,
  'amrap',
  E'Cindy\nA simple but challenging AMRAP of pull-ups, push-ups, and squats.\nAs many rounds as possible in 20 minutes of:\n- Pull-ups: 5 reps\n- Push-ups: 10 reps\n- Air Squats: 15 reps',
  '{"rounds": 1, "timeCap": 20, "movements": [{"exerciseId": "", "exerciseName": "Pull-ups", "reps": 5, "notes": ""}, {"exerciseId": "", "exerciseName": "Push-ups", "reps": 10, "notes": ""}, {"exerciseId": "", "exerciseName": "Air Squats", "reps": 15, "notes": ""}]}',
  'Girl',
  '2023-09-10T00:00:00Z'
),
-- hero-04: DT (5 rounds)
(
  'hhhhhhhh-0000-0000-0000-000000000004',
  'DT',
  'crossfit',
  20,
  'for_time',
  E'DT\nA hero WOD honoring USAF SSgt Timothy P. Davis, killed in Afghanistan in 2009.\n5 rounds for time of:\n- Deadlift: 12 reps (155/105 lb)\n- Hang Power Clean: 9 reps (155/105 lb)\n- Push Jerk: 6 reps (155/105 lb)',
  '{"rounds": 5, "timeCap": 20, "movements": [{"exerciseId": "", "exerciseName": "Deadlift", "reps": 12, "notes": "155/105 lb"}, {"exerciseId": "", "exerciseName": "Hang Power Clean", "reps": 9, "notes": "155/105 lb"}, {"exerciseId": "", "exerciseName": "Push Jerk", "reps": 6, "notes": "155/105 lb"}]}',
  'Hero',
  '2023-09-15T00:00:00Z'
),
-- hero-05: Helen (3 rounds)
(
  'hhhhhhhh-0000-0000-0000-000000000005',
  'Helen',
  'crossfit',
  15,
  'for_time',
  E'Helen\nA classic Girl WOD combining running, kettlebell swings, and pull-ups.\n3 rounds for time of:\n- Run: 400 meters\n- Kettlebell Swings: 21 reps (53/35 lb)\n- Pull-ups: 12 reps',
  '{"rounds": 3, "timeCap": 15, "movements": [{"exerciseId": "", "exerciseName": "Run", "reps": 1, "notes": "400 meters"}, {"exerciseId": "", "exerciseName": "Kettlebell Swings", "reps": 21, "notes": "53/35 lb"}, {"exerciseId": "", "exerciseName": "Pull-ups", "reps": 12, "notes": ""}]}',
  'Girl',
  '2023-09-20T00:00:00Z'
),
-- hero-06: Grace
(
  'hhhhhhhh-0000-0000-0000-000000000006',
  'Grace',
  'crossfit',
  10,
  'for_time',
  E'Grace\nComplete 30 clean and jerks for time.\nFor time:\n- Clean and Jerk: 30 reps (135/95 lb)',
  '{"rounds": 1, "timeCap": 10, "movements": [{"exerciseId": "", "exerciseName": "Clean and Jerk", "reps": 30, "notes": "135/95 lb"}]}',
  'Girl',
  '2023-10-01T00:00:00Z'
),
-- hero-07: Isabel
(
  'hhhhhhhh-0000-0000-0000-000000000007',
  'Isabel',
  'crossfit',
  10,
  'for_time',
  E'Isabel\nComplete 30 snatches for time.\nFor time:\n- Power Snatch: 30 reps (135/95 lb)',
  '{"rounds": 1, "timeCap": 10, "movements": [{"exerciseId": "", "exerciseName": "Power Snatch", "reps": 30, "notes": "135/95 lb"}]}',
  'Girl',
  '2023-10-05T00:00:00Z'
),
-- hero-08: Karen
(
  'hhhhhhhh-0000-0000-0000-000000000008',
  'Karen',
  'crossfit',
  15,
  'for_time',
  E'Karen\nComplete 150 wall-ball shots for time.\nFor time:\n- Wall Ball: 150 reps (20/14 lb to 10\'/9\' target)',
  '{"rounds": 1, "timeCap": 15, "movements": [{"exerciseId": "", "exerciseName": "Wall Ball", "reps": 150, "notes": "20/14 lb"}]}',
  'Girl',
  '2023-10-10T00:00:00Z'
),
-- hero-09: Elizabeth
(
  'hhhhhhhh-0000-0000-0000-000000000009',
  'Elizabeth',
  'crossfit',
  15,
  'for_time',
  E'Elizabeth\nComplete 21-15-9 reps of cleans and ring dips for time.\n21-15-9 reps for time of:\n- Clean (135/95 lb)\n- Ring Dip',
  '{"rounds": 1, "timeCap": 15, "movements": [{"exerciseId": "", "exerciseName": "Clean", "reps": 21, "notes": "21-15-9, 135/95 lb"}, {"exerciseId": "", "exerciseName": "Ring Dip", "reps": 21, "notes": "21-15-9"}]}',
  'Girl',
  '2023-10-15T00:00:00Z'
),
-- hero-10: Jackie
(
  'hhhhhhhh-0000-0000-0000-000000000010',
  'Jackie',
  'crossfit',
  15,
  'for_time',
  E'Jackie\nFor time: 1,000m row, 50 thrusters, 30 pull-ups.\nFor time:\n- Row: 1000 meters\n- Thrusters: 50 reps (45/35 lb)\n- Pull-ups: 30 reps',
  '{"rounds": 1, "timeCap": 15, "movements": [{"exerciseId": "", "exerciseName": "Row", "reps": 1, "notes": "1000 meters"}, {"exerciseId": "", "exerciseName": "Thrusters", "reps": 50, "notes": "45/35 lb"}, {"exerciseId": "", "exerciseName": "Pull-ups", "reps": 30, "notes": ""}]}',
  'Girl',
  '2023-10-20T00:00:00Z'
),

-- ============================================================
-- crossfit-current-wods.json — dd-01 to dd-07
-- All crossfit, wod_format NULL
-- ============================================================

-- dd-01: CrossFit - Cindy (250509) — has "CrossFit" → Benchmark
(
  'dddddddd-0000-0000-0000-000000000001',
  'CrossFit - Cindy (250509)',
  'crossfit',
  20,
  NULL,
  E'CrossFit - Cindy (250509)\nA classic benchmark, perfect preparation for Murph with pull-ups, push-ups, and air squats.\nAs many rounds as possible in 20 minutes of:\n- Pull-ups: 5 reps\n- Push-ups: 10 reps\n- Air Squats: 15 reps',
  NULL,
  'Benchmark',
  '2024-05-09T00:00:00Z'
),
-- dd-02: Box Jumps & Echo Bike (250507)
(
  'dddddddd-0000-0000-0000-000000000002',
  'Box Jumps & Echo Bike (250507)',
  'crossfit',
  20,
  NULL,
  E'Box Jumps & Echo Bike (250507)\nEMOM alternating between box jumps and Echo bike calories.\nEvery minute on the minute for 20 minutes (alternating):\n- Box Jumps: 12 reps (24/20 inch)\n- Echo Bike: 12 calories',
  NULL,
  'General',
  '2024-05-07T00:00:00Z'
),
-- dd-03: Static Hold Challenge (250512)
(
  'dddddddd-0000-0000-0000-000000000003',
  'Static Hold Challenge (250512)',
  'crossfit',
  20,
  NULL,
  E'Static Hold Challenge (250512)\nA unique effort focusing on static holds to challenge muscle stamina and mental fortitude.\n- Handstand Hold: 30 seconds\n- Squat Hold: 30 seconds (bottom position)\n- L-sit Hold: 30 seconds\n- Chin-over-bar Hold: 30 seconds',
  NULL,
  'General',
  '2024-05-12T00:00:00Z'
),
-- dd-04: Power Snatch & Row (250510)
(
  'dddddddd-0000-0000-0000-000000000004',
  'Power Snatch & Row (250510)',
  'crossfit',
  25,
  NULL,
  E'Power Snatch & Row (250510)\n5 rounds of power snatches and rowing with rest intervals.\n5 rounds:\n- Power Snatch: 5 reps (weight of choice)\n- Row: 400/500 meters',
  NULL,
  'General',
  '2024-05-10T00:00:00Z'
),
-- dd-05: Run & Walking Lunge Challenge (250414)
(
  'dddddddd-0000-0000-0000-000000000005',
  'Run & Walking Lunge Challenge (250414)',
  'crossfit',
  20,
  NULL,
  E'Run & Walking Lunge Challenge (250414)\n5 rounds of running and walking lunges for full leg conditioning.\n5 rounds:\n- Run: 350 meters\n- Walking Lunge: 50 meters',
  NULL,
  'General',
  '2024-04-14T00:00:00Z'
),
-- dd-06: Push-up, DB Snatch & TTB Challenge (250415)
(
  'dddddddd-0000-0000-0000-000000000006',
  'Push-up, DB Snatch & TTB Challenge (250415)',
  'crossfit',
  10,
  NULL,
  E'Push-up, DB Snatch & TTB Challenge (250415)\nA 10-minute AMRAP combining push-ups, dumbbell snatches, and toes-to-bars.\nAs many rounds as possible in 10 minutes of:\n- Push-ups: 10 reps\n- Dumbbell Snatch (Right): 10 reps (35/50 lb)\n- Toes-to-bar: 10 reps\n- Dumbbell Snatch (Left): 10 reps (35/50 lb)',
  NULL,
  'General',
  '2024-04-15T00:00:00Z'
),
-- dd-07: Double-Under, Row & Bar Muscle-Up Challenge (250412)
(
  'dddddddd-0000-0000-0000-000000000007',
  'Double-Under, Row & Bar Muscle-Up Challenge (250412)',
  'crossfit',
  30,
  NULL,
  E'Double-Under, Row & Bar Muscle-Up Challenge (250412)\nA descending rep scheme triplet testing gymnastics and endurance.\nFor time (descending scheme):\nRound 1: 150 Double-unders, 45 Cal Row, 15 Bar Muscle-ups\nRound 2: 120 Double-unders, 36 Cal Row, 12 Bar Muscle-ups\nRound 3: 90 Double-unders, 27 Cal Row, 9 Bar Muscle-ups',
  NULL,
  'General',
  '2024-04-12T00:00:00Z'
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
