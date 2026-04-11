create table if not exists public.exercises (
  id               uuid primary key default gen_random_uuid(),
  name             text not null unique,
  description      text,
  category_id      uuid references public.categories(id) on delete set null,
  movement_type    text not null check (movement_type in ('gymnastics', 'weightlifting', 'monostructural', 'mixed')),
  measurement_type text not null check (measurement_type in ('reps', 'weight', 'distance', 'time', 'calories')),
  difficulty_level text not null check (difficulty_level in ('beginner', 'intermediate', 'advanced', 'elite')),
  equipment        uuid[] not null default '{}',
  is_benchmark     boolean not null default false,
  video_url        text,
  scaling_options  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.exercises is 'Exercise catalog — authored by admins, read by athletes to build WODs';
comment on column public.exercises.equipment        is 'Array of equipment UUIDs referencing the equipment table';
comment on column public.exercises.is_benchmark     is 'True if this is a benchmark/hero WOD movement';
comment on column public.exercises.scaling_options  is 'Free text describing scaling/modification options';

-- RLS
alter table public.exercises enable row level security;

create policy "authenticated users can read exercises"
  on public.exercises for select
  to authenticated
  using (true);

create policy "admins can manage exercises"
  on public.exercises for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
