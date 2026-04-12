create table public.training_evaluations (
  id                      uuid primary key default gen_random_uuid(),
  garmin_activity_id      uuid not null references public.garmin_activities(id) on delete cascade,
  user_id                 uuid not null references auth.users(id) on delete cascade,
  summary                 text not null,
  readiness_level         text not null check (readiness_level in ('excellent', 'good', 'moderate', 'low', 'rest')),
  next_session_suggestion text not null,
  adaptation_warning      text,
  created_at              timestamptz not null default now(),

  constraint training_evaluations_garmin_activity_id_key unique (garmin_activity_id)
);

-- RLS
alter table public.training_evaluations enable row level security;

create policy "Users can read own training evaluations" on public.training_evaluations
  for select using (auth.uid() = user_id);

create policy "Users can insert own training evaluations" on public.training_evaluations
  for insert with check (auth.uid() = user_id);

-- Index
create index training_evaluations_garmin_activity_id_idx on public.training_evaluations (garmin_activity_id);
