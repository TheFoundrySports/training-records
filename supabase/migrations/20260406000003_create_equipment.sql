create table if not exists public.equipment (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.equipment is 'Equipment reference data (e.g. Barbell, Kettlebell, Pull-up bar)';

-- RLS
alter table public.equipment enable row level security;

create policy "authenticated users can read equipment"
  on public.equipment for select
  to authenticated
  using (true);

create policy "admins can manage equipment"
  on public.equipment for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
