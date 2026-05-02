-- Add enhanced_notes support to bjj_create_workout without breaking existing calls
-- Uses DEFAULT null so existing calls (without p_enhanced_notes) still work

-- Drop the old 6-parameter version first (CREATE OR REPLACE doesn't support signature changes)
drop function if exists public.bjj_create_workout(
  text, timestamptz, integer, text, integer, bjj_section_input[]
);

create function public.bjj_create_workout(
  p_title          text,
  p_performed_at   timestamptz,
  p_duration_min   integer,
  p_notes          text,
  p_rpe            integer,
  p_sections       bjj_section_input[],
  p_enhanced_notes text default null  -- NEW: optional enhanced notes
)
returns uuid
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
  insert into public.workouts (user_id, title, type, performed_at, duration_minutes, notes, enhanced_notes, rpe)
  values (auth.uid(), p_title, 'bjj', p_performed_at, p_duration_min, p_notes, p_enhanced_notes, p_rpe)
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

-- Re-grant execute to authenticated users
revoke all on function public.bjj_create_workout from public;
grant execute on function public.bjj_create_workout to authenticated;