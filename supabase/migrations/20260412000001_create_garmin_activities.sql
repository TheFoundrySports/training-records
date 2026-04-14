create table public.garmin_activities (
  id                      uuid primary key default gen_random_uuid(),
  workout_id              uuid not null references public.workouts(id) on delete cascade,
  user_id                 uuid not null references auth.users(id) on delete cascade,
  file_path               text not null,
  elapsed_time_seconds    integer,
  avg_heart_rate          integer,
  max_heart_rate          integer,
  training_load           numeric(6,2),
  recovery_time_hours     integer,
  calories                integer,
  vo2max                  numeric(5,2),
  hr_zone_1_seconds       integer not null default 0,
  hr_zone_2_seconds       integer not null default 0,
  hr_zone_3_seconds       integer not null default 0,
  hr_zone_4_seconds       integer not null default 0,
  hr_zone_5_seconds       integer not null default 0,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- RLS
alter table public.garmin_activities enable row level security;

create policy "Users can read own garmin activities" on public.garmin_activities
  for select using (auth.uid() = user_id);

create policy "Users can insert own garmin activities" on public.garmin_activities
  for insert with check (auth.uid() = user_id);

create policy "Users can update own garmin activities" on public.garmin_activities
  for update using (auth.uid() = user_id);

create policy "Users can delete own garmin activities" on public.garmin_activities
  for delete using (auth.uid() = user_id);

-- Indexes
create index garmin_activities_workout_id_idx on public.garmin_activities (workout_id);
create index garmin_activities_user_id_idx on public.garmin_activities (user_id);
