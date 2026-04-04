create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  type text not null check (type in ('crossfit', 'functional')),
  performed_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 1 and 300),
  notes text,
  rpe integer check (rpe between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.workouts enable row level security;

-- Athletes: full access to own records
create policy "Athletes can read own workouts" on public.workouts
  for select using (auth.uid() = user_id);
create policy "Athletes can insert own workouts" on public.workouts
  for insert with check (auth.uid() = user_id);
create policy "Athletes can update own workouts" on public.workouts
  for update using (auth.uid() = user_id);
create policy "Athletes can delete own workouts" on public.workouts
  for delete using (auth.uid() = user_id);

-- Admins: read all workouts
create policy "Admins can read all workouts" on public.workouts
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
