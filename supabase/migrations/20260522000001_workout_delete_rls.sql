-- T2: Admin DELETE policy for workouts
-- Allows admin users to delete any workout via RLS

create policy "admin_delete_workouts"
  on public.workouts
  for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );