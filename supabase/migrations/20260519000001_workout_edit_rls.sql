-- T1: RLS policies for workout edit
-- Admin UPDATE policies for workouts, bjj_sections, bjj_section_techniques
-- Athlete UPDATE policy for own workouts (bjj_sections and bjj_section_techniques
-- are handled via the SECURITY DEFINER RPC, so no athlete-level direct UPDATE there)

-- =========================================================
-- workouts — add admin UPDATE policy
-- Existing athlete UPDATE policy already handles owner access.
-- Add admin UPDATE policy so admins can update any workout.
-- =========================================================
create policy "admin_update_workouts"
  on public.workouts
  for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- =========================================================
-- workouts — add athlete UPDATE policy for own rows
-- (allows athletes to update their own workouts directly)
-- =========================================================
create policy "athlete_update_own_workouts"
  on public.workouts
  for update
  using (auth.uid() = user_id);

-- =========================================================
-- bjj_sections — add admin UPDATE policy
-- Ownership is via workouts join; existing policies handle athlete access.
-- =========================================================
create policy "admin_update_bjj_sections"
  on public.bjj_sections
  for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- =========================================================
-- bjj_section_techniques — add admin UPDATE policy
-- Athletes must use the SECURITY DEFINER RPC for all section technique updates.
-- No direct athlete UPDATE policy — the RPC is the only allowed path.
-- =========================================================
create policy "admin_update_bjj_section_techniques"
  on public.bjj_section_techniques
  for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );