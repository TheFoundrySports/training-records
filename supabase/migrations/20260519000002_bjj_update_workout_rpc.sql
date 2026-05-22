-- T2: bjj_update_workout RPC
-- SECURITY DEFINER function for updating BJJ workouts with upsert semantics on sections/techniques

-- Check if bjj_section_input exists and what fields it has
-- The current bjj_section_input (20260502000002) has:
--   section_number, goal, raw_description, duration_minutes, technique_ids, enhanced_notes
-- We need to add `id uuid` (nullable) as the first field for update support.

-- Create the update input type with id field (nullable = new section, non-null = existing section)
drop type if exists public.bjj_section_update_input;
create type bjj_section_update_input as (
  id               uuid,           -- NULL = new section, non-NULL = existing section to update
  section_number   integer,
  goal             text,
  raw_description  text,
  duration_minutes integer,
  technique_names  text[],         -- array of technique names (resolved to IDs in RPC)
  enhanced_notes   text
);

-- Drop existing version if any
drop function if exists public.bjj_update_workout(
  uuid, text, timestamptz, int, text, int, bjj_section_update_input[]
);

-- Create the update RPC
create function public.bjj_update_workout(
  p_workout_id     uuid,
  p_title          text,
  p_performed_at   timestamptz,
  p_duration_min   int,
  p_notes          text,
  p_rpe            int,
  p_sections       bjj_section_update_input[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workout_owner  uuid;
  v_user_role      text;
  v_section        bjj_section_update_input;
  v_section_id     uuid;
  v_tech_name      text;
  v_tech_id        uuid;
  v_section_ids    uuid[] := array[]::uuid[];
begin
  -- Reject unauthenticated calls immediately
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  -- Auth check: get user role and workout owner
  select role into v_user_role from public.profiles where id = auth.uid();
  select user_id into v_workout_owner from public.workouts where id = p_workout_id;

  if v_workout_owner is null then
    raise exception 'Workout not found';
  end if;

  if (v_user_role is distinct from 'admin') and v_workout_owner != auth.uid() then
    raise exception 'unauthorized';
  end if;

  -- Update workout fields
  update public.workouts
  set
    title            = p_title,
    performed_at     = p_performed_at,
    duration_minutes = p_duration_min,
    notes            = p_notes,
    rpe              = p_rpe,
    updated_at       = now()
  where id = p_workout_id;

  -- Process each section from the payload
  foreach v_section in array p_sections loop
    if v_section.id is not null then
      -- Update existing section
      update public.bjj_sections
      set
        section_number   = v_section.section_number,
        goal             = v_section.goal,
        raw_description  = v_section.raw_description,
        duration_minutes = v_section.duration_minutes,
        enhanced_notes   = v_section.enhanced_notes
      where id = v_section.id and workout_id = p_workout_id;

      v_section_id := v_section.id;
    else
      -- Insert new section
      insert into public.bjj_sections (workout_id, section_number, goal, raw_description, duration_minutes, enhanced_notes)
      values (p_workout_id, v_section.section_number, v_section.goal, v_section.raw_description, v_section.duration_minutes, v_section.enhanced_notes)
      returning id into v_section_id;
    end if;

    -- Track this section ID for the final cleanup
    v_section_ids := array_append(v_section_ids, v_section_id);

    -- Replace techniques for this section:
    -- 1. Delete existing technique links
    delete from public.bjj_section_techniques where section_id = v_section_id;

    -- 2. Insert new technique links (lookup by name)
    if v_section.technique_names is not null then
      foreach v_tech_name in array v_section.technique_names loop
        select id into v_tech_id from public.bjj_techniques where name = v_tech_name limit 1;
        if v_tech_id is not null then
          insert into public.bjj_section_techniques (section_id, technique_id)
          values (v_section_id, v_tech_id)
          on conflict do nothing;
        end if;
      end loop;
    end if;
  end loop;

  -- Delete sections that were removed in the form
  -- (sections with non-null IDs that were not in the payload)
  if cardinality(v_section_ids) > 0 then
    delete from public.bjj_sections
    where workout_id = p_workout_id
      and id != all(v_section_ids);
  else
    -- No sections in payload — delete all existing sections for this workout
    delete from public.bjj_sections where workout_id = p_workout_id;
  end if;
end;
$$;

-- Grant execute to authenticated role
revoke all on function public.bjj_update_workout from public;
grant execute on function public.bjj_update_workout to authenticated;