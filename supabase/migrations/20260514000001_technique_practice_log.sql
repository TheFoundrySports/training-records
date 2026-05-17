-- =========================================================
-- technique_practice_log — per-user per-technique practice aggregate
-- Triggers on bjj_section_techniques INSERT to upsert practice counts
-- =========================================================
create table public.technique_practice_log (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references auth.users(id) on delete cascade,
  technique_id        uuid        not null references public.bjj_techniques(id) on delete cascade,
  total_practices     integer     not null default 1,
  first_practiced_at  timestamptz not null,
  last_practiced_at   timestamptz not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint technique_practice_log_unique unique (user_id, technique_id)
);

-- Index for fast user lookup (primary query pattern)
create index technique_practice_log_user_id_idx on public.technique_practice_log(user_id);
-- Index for technique-level aggregation queries
create index technique_practice_log_technique_id_idx on public.technique_practice_log(technique_id);
-- Composite index for the upsert conflict resolution path
create index technique_practice_log_user_technique_idx on public.technique_practice_log(user_id, technique_id);

-- =========================================================
-- Auto-update updated_at trigger function
-- =========================================================
create or replace function public.set_technique_practice_log_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger technique_practice_log_updated_at
  before update on public.technique_practice_log
  for each row execute procedure public.set_technique_practice_log_updated_at();

-- =========================================================
-- RLS: users can only read their own practice logs
-- =========================================================
alter table public.technique_practice_log enable row level security;

create policy "Users can read own technique_practice_log"
  on public.technique_practice_log for select
  using (auth.uid() = user_id);

create policy "Users can insert own technique_practice_log"
  on public.technique_practice_log for insert
  with check (auth.uid() = user_id);

create policy "Users can update own technique_practice_log"
  on public.technique_practice_log for update
  using (auth.uid() = user_id);

-- =========================================================
-- Trigger function: upsert on bjj_section_techniques INSERT
-- Derives user_id and performed_at from workout via bjj_sections join
-- =========================================================
create or replace function public.update_technique_practice_log()
returns trigger language plpgsql as $$
declare
  v_performed_at timestamptz;
  v_user_id      uuid;
begin
  -- Derive user and timestamp from the parent workout through bjj_sections
  select w.performed_at, w.user_id
    into v_performed_at, v_user_id
    from public.bjj_sections s
    join public.workouts w on w.id = s.workout_id
    where s.id = new.section_id;

  -- Upsert: increment practices, update last_practiced_at to latest timestamp
  insert into public.technique_practice_log
    (user_id, technique_id, total_practices, first_practiced_at, last_practiced_at)
  values
    (v_user_id, new.technique_id, 1, v_performed_at, v_performed_at)
  on conflict (user_id, technique_id) do update set
    total_practices   = technique_practice_log.total_practices + 1,
    last_practiced_at = greatest(technique_practice_log.last_practiced_at, v_performed_at),
    updated_at        = now();

  return new;
end;
$$;

-- Fire trigger after each new technique link is inserted into bjj_section_techniques
create trigger technique_practice_log_trigger
  after insert on public.bjj_section_techniques
  for each row execute function public.update_technique_practice_log();

-- =========================================================
-- Verification comments (Supabase schema diff validates these):
--
-- ASSERT: technique_practice_log table exists with correct column types
-- ASSERT: unique constraint on (user_id, technique_id) prevents duplicates
-- ASSERT: RLS enabled and policy restricts reads to auth.uid() = user_id
-- ASSERT: trigger function exists with signature (returns trigger)
-- ASSERT: trigger fires AFTER INSERT ON bjj_section_techniques
-- ASSERT: updated_at auto-updates via trigger on before update
-- =========================================================