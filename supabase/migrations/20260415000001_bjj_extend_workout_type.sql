-- Step 1: drop the existing unnamed CHECK (PostgreSQL auto-names it workouts_type_check)
alter table public.workouts
  drop constraint workouts_type_check;

-- Step 2: add the extended constraint including 'bjj'
alter table public.workouts
  add constraint workouts_type_check
  check (type in ('crossfit', 'functional', 'bjj'));
