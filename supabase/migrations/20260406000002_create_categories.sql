create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.categories is 'Exercise categories (e.g. Gymnastics, Weightlifting, Monostructural)';

-- RLS
alter table public.categories enable row level security;

create policy "authenticated users can read categories"
  on public.categories for select
  to authenticated
  using (true);

create policy "admins can manage categories"
  on public.categories for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
