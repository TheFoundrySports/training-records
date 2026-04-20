-- Input type for sections
create type bjj_section_input as (
  section_number   integer,
  goal             text,
  raw_description  text,
  duration_minutes integer,
  technique_ids    uuid[]
);

-- Transactional RPC: creates workout + all sections + all technique links atomically
create or replace function public.bjj_create_workout(
  p_title          text,
  p_performed_at   timestamptz,
  p_duration_min   integer,
  p_notes          text,
  p_rpe            integer,
  p_sections       bjj_section_input[]
)
returns uuid   -- returns workout.id
language plpgsql
security definer
as $$
declare
  v_workout_id     uuid;
  v_section_id     uuid;
  v_section        bjj_section_input;
  v_technique_id   uuid;
begin
  -- Insert workout (user_id from auth.uid())
  insert into public.workouts (user_id, title, type, performed_at, duration_minutes, notes, rpe)
  values (auth.uid(), p_title, 'bjj', p_performed_at, p_duration_min, p_notes, p_rpe)
  returning id into v_workout_id;

  -- Insert each section
  foreach v_section in array p_sections
  loop
    insert into public.bjj_sections
      (workout_id, section_number, goal, raw_description, duration_minutes)
    values
      (v_workout_id, v_section.section_number, v_section.goal,
       v_section.raw_description, v_section.duration_minutes)
    returning id into v_section_id;

    -- Insert technique links for this section
    if v_section.technique_ids is not null then
      foreach v_technique_id in array v_section.technique_ids
      loop
        insert into public.bjj_section_techniques (section_id, technique_id)
        values (v_section_id, v_technique_id)
        on conflict do nothing;
      end loop;
    end if;
  end loop;

  return v_workout_id;
end;
$$;

-- Grant execute to authenticated users only
revoke all on function public.bjj_create_workout from public;
grant execute on function public.bjj_create_workout to authenticated;
