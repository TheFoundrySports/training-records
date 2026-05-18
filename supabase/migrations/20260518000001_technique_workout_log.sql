-- technique_workout_log: deduplication table for technique practice counting
-- Ensures one row per (user_id, technique_id, workout_id) — prevents section-level inflation
create table public.technique_workout_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  technique_id uuid not null references public.bjj_techniques(id) on delete cascade,
  workout_id   uuid not null references public.workouts(id) on delete cascade,
  practiced_at timestamptz not null,
  created_at   timestamptz not null default now(),
  constraint technique_workout_log_unique unique (user_id, technique_id, workout_id)
);

create index technique_workout_log_user_idx on public.technique_workout_log(user_id);
create index technique_workout_log_user_technique_idx on public.technique_workout_log(user_id, technique_id);

alter table public.technique_workout_log enable row level security;

create policy "Users can read own technique_workout_log"
  on public.technique_workout_log for select using (auth.uid() = user_id);

create policy "Service role can manage technique_workout_log"
  on public.technique_workout_log for all using (true) with check (true);