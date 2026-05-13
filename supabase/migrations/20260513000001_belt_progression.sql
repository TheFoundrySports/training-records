-- =========================================================
-- belt_progression — per-user per-item completion state
-- =========================================================
create table public.belt_progression (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  belt_level    text        not null default 'blue' check (belt_level = 'blue'),
  section_id    text        not null,
  item_id       text        not null,
  is_complete   boolean     not null default false,
  completed_at  timestamptz,
  technique_id  uuid        references public.bjj_techniques(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (user_id, belt_level, section_id, item_id)
);

alter table public.belt_progression enable row level security;

-- Users CRUD only their own rows
create policy "Users can read own belt_progression"
  on public.belt_progression for select
  using (auth.uid() = user_id);

create policy "Users can insert own belt_progression"
  on public.belt_progression for insert
  with check (auth.uid() = user_id);

create policy "Users can update own belt_progression"
  on public.belt_progression for update
  using (auth.uid() = user_id);

create policy "Users can delete own belt_progression"
  on public.belt_progression for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.set_belt_progression_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger belt_progression_updated_at
  before update on public.belt_progression
  for each row execute procedure public.set_belt_progression_updated_at();

-- Index for fast user lookup (most common query)
create index idx_belt_progression_user_id on public.belt_progression(user_id);

-- =========================================================
-- belt_progression_ui_state — per-user per-section collapse state
-- =========================================================
create table public.belt_progression_ui_state (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  belt_level   text        not null default 'blue' check (belt_level = 'blue'),
  section_id   text        not null,
  is_expanded  boolean     not null default false,
  updated_at   timestamptz not null default now(),

  unique (user_id, belt_level, section_id)
);

alter table public.belt_progression_ui_state enable row level security;

-- Users CRUD only their own rows
create policy "Users can read own belt_progression_ui_state"
  on public.belt_progression_ui_state for select
  using (auth.uid() = user_id);

create policy "Users can insert own belt_progression_ui_state"
  on public.belt_progression_ui_state for insert
  with check (auth.uid() = user_id);

create policy "Users can update own belt_progression_ui_state"
  on public.belt_progression_ui_state for update
  using (auth.uid() = user_id);

create policy "Users can delete own belt_progression_ui_state"
  on public.belt_progression_ui_state for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.set_belt_progression_ui_state_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger belt_progression_ui_state_updated_at
  before update on public.belt_progression_ui_state
  for each row execute procedure public.set_belt_progression_ui_state_updated_at();

-- Index for fast user lookup
create index idx_belt_progression_ui_state_user_id on public.belt_progression_ui_state(user_id);