-- =========================================================
-- bjj_roll_events — per-section roll lifecycle (proposed/confirmed/rejected)
-- Refs: REQ-RE1 / REQ-RE2 / REQ-RE3 (openspec/changes/bjj-evolution-dashboard/specs/bjj-roll-events/spec.md)
-- =========================================================
-- Enums: 4 total. Locked values from design.md §3.1.
-- =========================================================
create type public.bjj_roll_role         as enum ('attacking','defending','neutral');
create type public.bjj_roll_outcome      as enum ('submission','position_gain','position_loss','neutral');
create type public.bjj_roll_event_status as enum ('proposed','confirmed','rejected');
create type public.bjj_roll_event_source as enum ('ai_confirmed','ai_edited','manual');

-- =========================================================
-- Table: bjj_roll_events
-- =========================================================
create table public.bjj_roll_events (
  id               uuid                          primary key default gen_random_uuid(),
  user_id          uuid                          not null references auth.users(id)          on delete cascade,
  workout_id       uuid                          not null references public.workouts(id)     on delete cascade,
  section_id       uuid                          not null references public.bjj_sections(id) on delete cascade,
  roll_index       integer                       not null,
  role             public.bjj_roll_role          not null,
  outcome          public.bjj_roll_outcome       not null,
  position_from    text                          not null,
  position_to      text,
  technique_ids    uuid[]                        not null default '{}',
  confidence       real                          check (confidence is null or (confidence >= 0 and confidence <= 1)),
  raw_excerpt      text,
  status           public.bjj_roll_event_status  not null default 'proposed',
  source           public.bjj_roll_event_source,
  validation_error text,
  created_at       timestamptz                   not null default now(),
  updated_at       timestamptz                   not null default now(),

  constraint bjj_roll_events_section_index_unique unique (section_id, roll_index)
);

-- =========================================================
-- Indexes: 3 total (REQ-RE2)
--   - user_workout_idx: per-workout reads
--   - user_status_idx:  aggregations filter by status='confirmed'
--   - performed_lookup_idx: section-scoped lookups
-- =========================================================
create index bjj_roll_events_user_workout_idx     on public.bjj_roll_events(user_id, workout_id);
create index bjj_roll_events_user_status_idx      on public.bjj_roll_events(user_id, status);
create index bjj_roll_events_performed_lookup_idx on public.bjj_roll_events(user_id, section_id);

-- =========================================================
-- RLS (REQ-RE3): 4 policies, owner-scoped via
--   bjj_sections → workouts → auth.uid() chain
-- Mirrors bjj_section_techniques pattern (supabase/migrations/20260415000002_create_bjj_tables.sql).
-- =========================================================
alter table public.bjj_roll_events enable row level security;

create policy "Users can read own bjj_roll_events"
  on public.bjj_roll_events for select
  using (exists (select 1 from public.bjj_sections s
                 join public.workouts w on w.id = s.workout_id
                 where s.id = bjj_roll_events.section_id and w.user_id = auth.uid()));

create policy "Users can insert own bjj_roll_events"
  on public.bjj_roll_events for insert
  with check (exists (select 1 from public.bjj_sections s
                      join public.workouts w on w.id = s.workout_id
                      where s.id = bjj_roll_events.section_id and w.user_id = auth.uid()));

create policy "Users can update own bjj_roll_events"
  on public.bjj_roll_events for update
  using (exists (select 1 from public.bjj_sections s
                 join public.workouts w on w.id = s.workout_id
                 where s.id = bjj_roll_events.section_id and w.user_id = auth.uid()))
  with check (exists (select 1 from public.bjj_sections s
                      join public.workouts w on w.id = s.workout_id
                      where s.id = bjj_roll_events.section_id and w.user_id = auth.uid()));

create policy "Users can delete own bjj_roll_events"
  on public.bjj_roll_events for delete
  using (exists (select 1 from public.bjj_sections s
                 join public.workouts w on w.id = s.workout_id
                 where s.id = bjj_roll_events.section_id and w.user_id = auth.uid()));

-- =========================================================
-- updated_at trigger
-- =========================================================
create or replace function public.set_bjj_roll_events_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bjj_roll_events_updated_at
  before update on public.bjj_roll_events
  for each row execute procedure public.set_bjj_roll_events_updated_at();
