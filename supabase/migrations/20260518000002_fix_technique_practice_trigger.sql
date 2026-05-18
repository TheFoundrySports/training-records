-- Rewrite trigger function to deduplicate by workout
-- The trigger binding (technique_practice_log_trigger) already exists — only replace the function body
create or replace function public.update_technique_practice_log()
returns trigger language plpgsql as $$
declare
  v_performed_at timestamptz;
  v_user_id      uuid;
  v_workout_id   uuid;
  v_inserted     integer;
begin
  select w.performed_at, w.user_id, w.id
    into v_performed_at, v_user_id, v_workout_id
    from public.bjj_sections s
    join public.workouts w on w.id = s.workout_id
    where s.id = new.section_id;

  -- Insert dedup record (one per workout per technique)
  insert into public.technique_workout_log
    (user_id, technique_id, workout_id, practiced_at)
  values
    (v_user_id, new.technique_id, v_workout_id, v_performed_at)
  on conflict (user_id, technique_id, workout_id) do nothing;

  get diagnostics v_inserted = row_count;

  -- Only increment aggregate if this is first section for this workout+technique
  if v_inserted = 1 then
    insert into public.technique_practice_log
      (user_id, technique_id, total_practices, first_practiced_at, last_practiced_at)
    values
      (v_user_id, new.technique_id, 1, v_performed_at, v_performed_at)
    on conflict (user_id, technique_id) do update set
      total_practices   = technique_practice_log.total_practices + 1,
      last_practiced_at = greatest(technique_practice_log.last_practiced_at, v_performed_at),
      updated_at        = now();
  end if;

  return new;
end;
$$;