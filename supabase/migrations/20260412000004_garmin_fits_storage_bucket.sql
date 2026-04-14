-- Create private storage bucket for Garmin .fit files
insert into storage.buckets (id, name, public)
values ('garmin-fits', 'garmin-fits', false)
on conflict (id) do nothing;

-- RLS: users can only access their own files
-- Files are stored under {user_id}/{workout_id}/{filename}
create policy "Users can upload own fit files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'garmin-fits'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Users can read own fit files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'garmin-fits'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Users can delete own fit files" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'garmin-fits'
    and split_part(name, '/', 1) = auth.uid()::text
  );
