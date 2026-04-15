-- =========================================================
-- bjj_techniques — admin-managed technique catalog
-- =========================================================
create table public.bjj_techniques (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null unique,
  description text,
  category    text        check (category in ('guard', 'takedown', 'submission', 'escape', 'transition', 'other')),
  youtube_url text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.bjj_techniques enable row level security;

-- All authenticated users can read the technique catalog
create policy "Authenticated users can read bjj_techniques"
  on public.bjj_techniques for select
  using (auth.role() = 'authenticated');

-- Only admins can write techniques
create policy "Admins can insert bjj_techniques"
  on public.bjj_techniques for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update bjj_techniques"
  on public.bjj_techniques for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete bjj_techniques"
  on public.bjj_techniques for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Auto-update updated_at on technique row update
create or replace function public.set_bjj_techniques_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bjj_techniques_updated_at
  before update on public.bjj_techniques
  for each row execute procedure public.set_bjj_techniques_updated_at();

-- =========================================================
-- bjj_sections — sections within a BJJ workout
-- =========================================================
create table public.bjj_sections (
  id               uuid        primary key default gen_random_uuid(),
  workout_id       uuid        not null references public.workouts(id) on delete cascade,
  section_number   integer     not null check (section_number >= 1),
  goal             text        not null,
  raw_description  text,
  ai_description   text,
  duration_minutes integer     check (duration_minutes between 1 and 300),
  created_at       timestamptz not null default now(),

  unique (workout_id, section_number)
);

alter table public.bjj_sections enable row level security;

-- Owner access through workout ownership
create policy "Users can read own bjj_sections"
  on public.bjj_sections for select
  using (
    exists (select 1 from public.workouts where id = workout_id and user_id = auth.uid())
  );

create policy "Users can insert own bjj_sections"
  on public.bjj_sections for insert
  with check (
    exists (select 1 from public.workouts where id = workout_id and user_id = auth.uid())
  );

create policy "Users can update own bjj_sections"
  on public.bjj_sections for update
  using (
    exists (select 1 from public.workouts where id = workout_id and user_id = auth.uid())
  );

create policy "Users can delete own bjj_sections"
  on public.bjj_sections for delete
  using (
    exists (select 1 from public.workouts where id = workout_id and user_id = auth.uid())
  );

-- =========================================================
-- bjj_section_techniques — junction: section ↔ technique
-- =========================================================
create table public.bjj_section_techniques (
  section_id   uuid not null references public.bjj_sections(id) on delete cascade,
  technique_id uuid not null references public.bjj_techniques(id) on delete cascade,
  primary key (section_id, technique_id)
);

alter table public.bjj_section_techniques enable row level security;

-- RLS via section → workout → user chain
create policy "Users can read own bjj_section_techniques"
  on public.bjj_section_techniques for select
  using (
    exists (
      select 1 from public.bjj_sections s
      join public.workouts w on w.id = s.workout_id
      where s.id = section_id and w.user_id = auth.uid()
    )
  );

create policy "Users can insert own bjj_section_techniques"
  on public.bjj_section_techniques for insert
  with check (
    exists (
      select 1 from public.bjj_sections s
      join public.workouts w on w.id = s.workout_id
      where s.id = section_id and w.user_id = auth.uid()
    )
  );

create policy "Users can delete own bjj_section_techniques"
  on public.bjj_section_techniques for delete
  using (
    exists (
      select 1 from public.bjj_sections s
      join public.workouts w on w.id = s.workout_id
      where s.id = section_id and w.user_id = auth.uid()
    )
  );

-- =========================================================
-- Indexes
-- =========================================================

-- Fast section lookup by workout (heavily used in detail page)
create index idx_bjj_sections_workout_id on public.bjj_sections(workout_id);

-- Fast junction lookup by section (used when loading sections with techniques)
create index idx_bjj_section_techniques_section_id on public.bjj_section_techniques(section_id);

-- ILIKE search on technique name via GIN trigram index
create extension if not exists pg_trgm;
create index idx_bjj_techniques_name_trgm on public.bjj_techniques using gin (name gin_trgm_ops);
create index idx_bjj_techniques_category on public.bjj_techniques(category);
