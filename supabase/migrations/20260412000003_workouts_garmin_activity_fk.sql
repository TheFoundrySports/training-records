-- Add garmin_activity_id FK to workouts (nullable — set on import)
alter table public.workouts
  add column if not exists garmin_activity_id uuid references public.garmin_activities(id) on delete set null;
