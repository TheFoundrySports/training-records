-- =========================================================
-- Fix #70: public.user_profiles view exposes auth.users data
-- Lint: 0002_auth_users_exposed
-- =========================================================
-- Original view ran with default SECURITY DEFINER semantics,
-- which means it executes as the view owner (postgres) and
-- bypasses any RLS on auth.users — letting anon/authenticated
-- callers read every email through PostgREST.
--
-- This migration makes the view run as the calling role
-- (security_invoker = on) and gates auth.users with RLS:
--   * self policy: every authenticated user can read their own row
--   * admin policy: only profiles.role = 'admin' can read all rows
--
-- For the policies to be effective, the migration role needs to
-- grant SELECT on auth.users to authenticated. The Supabase
-- migration role has GRANT OPTION for SELECT on auth.users, so
-- this works both locally and in Cloud without SET ROLE dance.
--
-- RLS on auth.users is already enabled by default in modern
-- Supabase images, so we do not ALTER the table — the schema
-- owner is the only role allowed to do that.
--
-- All statements are idempotent so the migration can be re-applied
-- safely (CREATE POLICY IF NOT EXISTS requires Postgres 16+, so we
-- gate with a pg_policy lookup for compatibility with Postgres 15).
-- =========================================================

-- 1. Let authenticated actually read auth.users so RLS can filter rows.
--    RLS restricts which rows, the GRANT controls whether they can read
--    the table at all. GRANT is idempotent.
grant select on auth.users to authenticated;

-- 2. Self-select policy on auth.users.
do $$
begin
  if not exists (
    select 1 from pg_policy
    where polrelid = 'auth.users'::regclass
      and polname = 'Users can read own auth row'
  ) then
    create policy "Users can read own auth row"
      on auth.users
      for select
      to authenticated
      using (auth.uid() = id);
  end if;
end $$;

-- 3. Admin policy — admins (per public.profiles.role) can read all auth rows.
do $$
begin
  if not exists (
    select 1 from pg_policy
    where polrelid = 'auth.users'::regclass
      and polname = 'Admins can read all auth users'
  ) then
    create policy "Admins can read all auth users"
      on auth.users
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
      );
  end if;
end $$;

-- 4. Recreate the view with security_invoker = on so it runs as the
--    calling role. CREATE OR REPLACE cannot change view options, so
--    we drop and recreate explicitly.
drop view if exists public.user_profiles;
create view public.user_profiles
  with (security_invoker = on)
as
  select
    p.id,
    u.email,
    p.role,
    p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id;

-- 5. Keep the GRANT on the view so PostgREST exposes it to authenticated.
--    RLS on auth.users (and on public.profiles) is what now restricts
--    which rows each caller sees.
grant select on public.user_profiles to authenticated;
