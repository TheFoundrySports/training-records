-- =========================================================
-- ai_settings — single-row global AI provider configuration
-- =========================================================
create table public.ai_settings (
  id            uuid        primary key default '00000000-0000-0000-0000-000000000001',
  provider_name text        not null default 'openai',
  base_url      text        not null default 'https://api.openai.com/v1',
  model         text        not null default 'gpt-4o-mini',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Enforce single-row: only the fixed UUID is allowed
  constraint ai_settings_single_row check (id = '00000000-0000-0000-0000-000000000001')
);

alter table public.ai_settings enable row level security;

-- Only admins can read or write AI settings
create policy "Admins can manage ai_settings"
  on public.ai_settings for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Auto-update updated_at on row update
create or replace function public.set_ai_settings_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger ai_settings_updated_at
  before update on public.ai_settings
  for each row execute procedure public.set_ai_settings_updated_at();
