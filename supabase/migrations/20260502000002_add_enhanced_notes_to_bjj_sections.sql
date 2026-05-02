-- Add enhanced_notes to bjj_sections table and update RPC to support section-level AI notes
-- Part 2 of enhanced notes move: this adds enhanced_notes to sections level

-- Add enhanced_notes column to bjj_sections (nullable)
alter table public.bjj_sections add column enhanced_notes text;

-- Drop dependent function first, then update composite type
drop function if exists public.bjj_create_workout(
  text, timestamptz, integer, text, integer, bjj_section_input[], text
);

drop type if exists public.bjj_section_input;

-- Recreate bjj_section_input with enhanced_notes field
create type bjj_section_input as (
  section_number   integer,
  goal             text,
  raw_description  text,
  duration_minutes integer,
  technique_ids    uuid[],
  enhanced_notes   text
);

-- Recreate bjj_create_workout to insert section-level enhanced_notes
create function public.bjj_create_workout(
  p_title          text,
  p_performed_at   timestamptz,
  p_duration_min   integer,
  p_notes          text,
  p_rpe            integer,
  p_sections       bjj_section_input[],
  p_enhanced_notes text default null
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
  -- Insert workout
  insert into public.workouts (user_id, title, type, performed_at, duration_minutes, notes, enhanced_notes, rpe)
  values (auth.uid(), p_title, 'bjj', p_performed_at, p_duration_min, p_notes, p_enhanced_notes, p_rpe)
  returning id into v_workout_id;

  -- Insert each section including section-level enhanced_notes
  foreach v_section in array p_sections
  loop
    insert into public.bjj_sections
      (workout_id, section_number, goal, raw_description, duration_minutes, enhanced_notes)
    values
      (v_workout_id, v_section.section_number, v_section.goal,
       v_section.raw_description, v_section.duration_minutes, v_section.enhanced_notes)
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
