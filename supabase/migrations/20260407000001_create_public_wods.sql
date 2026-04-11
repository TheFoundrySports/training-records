-- Migration: create public_wods table
-- Public WODs are reference workouts (benchmarks, hero WODs, etc.)
-- that authenticated athletes can browse and load into the workout form.
-- Only admins can write; all authenticated users can read.

create table public.public_wods (
  id               uuid        primary key default gen_random_uuid(),
  title            text        not null,
  type             text        not null check (type in ('crossfit', 'functional')),
  duration_minutes integer,
  wod_format       text        check (wod_format in ('amrap', 'for_time', 'emom', 'tabata', 'ladder', 'rft')),
  wod_text         text,
  payload          jsonb,
  category         text        check (category in ('Hero', 'Girl', 'Benchmark', 'General')),
  created_at       timestamptz not null default now()
);

-- Full-text search on title
create index idx_public_wods_title_search on public.public_wods
  using gin (to_tsvector('english', title));

-- Filter by category
create index idx_public_wods_category on public.public_wods (category);

-- Enable RLS
alter table public.public_wods enable row level security;

-- Anyone authenticated can read
create policy "public_wods_select_authenticated"
  on public.public_wods
  for select
  to authenticated
  using (true);

-- Only admins can insert
create policy "public_wods_insert_admin"
  on public.public_wods
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Only admins can update
create policy "public_wods_update_admin"
  on public.public_wods
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Only admins can delete
create policy "public_wods_delete_admin"
  on public.public_wods
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
