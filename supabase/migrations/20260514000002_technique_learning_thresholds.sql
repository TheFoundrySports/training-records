-- =========================================================
-- technique_learning_thresholds — per-technique practice threshold overrides
-- Defaults to 10 practices if no row exists (see REQ-TT2 in spec)
-- =========================================================
create table public.technique_learning_thresholds (
  id                uuid        primary key default gen_random_uuid(),
  technique_id      uuid        not null unique references public.bjj_techniques(id) on delete cascade,
  required_practices integer    not null default 10 check (required_practices >= 1),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Index for fast technique lookup when joining with practice log
create index technique_learning_thresholds_technique_id_idx
  on public.technique_learning_thresholds(technique_id);

-- =========================================================
-- Auto-update updated_at trigger function
-- =========================================================
create or replace function public.set_technique_learning_thresholds_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger technique_learning_thresholds_updated_at
  before update on public.technique_learning_thresholds
  for each row execute procedure public.set_technique_learning_thresholds_updated_at();

-- =========================================================
-- RLS: any authenticated user can read thresholds; only service_role can write
-- (thresholds are admin-managed configuration, not user data)
-- =========================================================
alter table public.technique_learning_thresholds enable row level security;

create policy "Authenticated users can read thresholds"
  on public.technique_learning_thresholds for select
  to authenticated
  using (true);

create policy "Service role can manage thresholds"
  on public.technique_learning_thresholds for all
  to service_role
  using (true);

-- =========================================================
-- Verification comments:
--
-- ASSERT: technique_learning_thresholds table exists with correct column types
-- ASSERT: unique constraint on technique_id prevents duplicate threshold rows
-- ASSERT: check constraint requires required_practices >= 1
-- ASSERT: RLS enabled — authenticated read + service_role full access
-- ASSERT: updated_at auto-updates via trigger on before update
-- =========================================================