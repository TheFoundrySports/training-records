-- Migration: allow anonymous users to read public_wods
-- public_wods are reference data (benchmarks, hero WODs) — no auth needed to browse them.
-- Write policies remain restricted to admins only.

drop policy if exists "public_wods_select_authenticated" on public.public_wods;

create policy "public_wods_select_any"
  on public.public_wods
  for select
  to anon, authenticated
  using (true);
