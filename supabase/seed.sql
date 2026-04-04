-- Seed data for local development only
-- Creates 2 athlete users and 1 admin, plus sample workouts
-- Run after `supabase db reset`

-- Seed users (passwords: Password123!)
-- These are inserted into auth.users directly for local dev
insert into auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) values
  (
    '00000000-0000-0000-0000-000000000001',
    'athlete1@example.com',
    crypt('Password123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    'authenticated'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'athlete2@example.com',
    crypt('Password123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    'authenticated'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'admin@example.com',
    crypt('Password123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    'authenticated'
  )
on conflict (id) do nothing;

-- Profiles (athlete1 and athlete2 get 'athlete', admin gets 'admin')
insert into public.profiles (id, role)
values
  ('00000000-0000-0000-0000-000000000001', 'athlete'),
  ('00000000-0000-0000-0000-000000000002', 'athlete'),
  ('00000000-0000-0000-0000-000000000003', 'admin')
on conflict (id) do update set role = excluded.role;

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
