-- =========================================================
-- bjj_dashboard_data RPC — window-scoped (D1)
-- PR1: data correctness — scoped_rolls CTE + payload-shape fixes
-- Supersedes 20260612000005 via `create or replace function`
-- =========================================================
-- DEFENSIVE NOTE:
--   This migration has NOT been executed against real Postgres.
--   The repo has no staging environment. The user is the first to
--   run `supabase db reset` against a real instance. The structural
--   Vitest test in src/__tests__/db/bjj-dashboard-data-rpc.test.ts
--   asserts the function signature, security model, window resolution,
--   scoped_rolls CTE, and return shape — but it does NOT run the SQL.
--   First smoke test: `select public.bjj_dashboard_data('30d');` against
--   a real Postgres instance.
-- =========================================================
-- CHANGES from 20260612000005:
--   1. Adds `scoped_rolls` CTE (D1) — bjj_roll_events ⋈ workouts,
--      applies window predicate (status='confirmed', w.type='bjj', date/10r filter)
--   2. Role balance, Outcomes, Roll flow now read from scoped_rolls
--      instead of unfiltered bjj_dashboard_* views
--   3. Payload-shape fixes (match dashboard.types.ts contract):
--      - Echo back: window, start_date, end_date, generated_at_tz
--      - Aggregates: total_workouts, total_rolls, total_techniques
--      - last_techniques: wrap in {rows: [...]}
--      - technique_types: return {total, segments, insights}
--      - role_balance: return {segments, total_rolls}
--      - outcomes: return {tiles, total_rolls}
-- =========================================================
create or replace function public.bjj_dashboard_data(
  p_window text,
  p_start  date default null,
  p_end    date default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id  uuid := auth.uid();
  v_start    date;
  v_end      date;
  v_limit    int  := null;
  v_payload  jsonb;
begin
  -- Auth gate
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  -- Window resolution
  if p_window = '7d' then
    v_start := current_date - 7;
    v_end   := current_date;
  elsif p_window = '30d' then
    v_start := current_date - 30;
    v_end   := current_date;
  elsif p_window = '90d' then
    v_start := current_date - 90;
    v_end   := current_date;
  elsif p_window = '10r' then
    v_limit := 10;
  else
    raise exception 'UNKNOWN_WINDOW %', p_window using errcode = 'P0001';
  end if;

  -- Compose BJJDashboardData payload
  with scoped_rolls as (
    -- D1: window-filtered rolls for role_balance, outcomes, roll_flow
    select
      r.role,
      r.outcome,
      r.position_from,
      r.position_to,
      r.technique_ids,
      r.workout_id
    from public.bjj_roll_events r
    join public.workouts w on w.id = r.workout_id
    where r.user_id = v_user_id
      and r.status = 'confirmed'
      and w.type = 'bjj'
      and (
        (p_window <> '10r' and w.performed_at::date >= v_start)
        or (p_window = '10r' and w.id in (
          select w2.id from public.workouts w2
          where w2.user_id = v_user_id and w2.type = 'bjj'
            and exists (
              select 1 from public.bjj_roll_events re
              where re.workout_id = w2.id and re.status = 'confirmed'
            )
          order by w2.performed_at desc
          limit v_limit
        ))
      )
  )
  select jsonb_build_object(
    -- Window echo (new)
    'window', p_window,

    -- Page metadata
    'title', 'BJJ Evolution Dashboard',
    'subtitle', 'Your game over the selected window: techniques, role balance, and how your rolls end.',
    'generated_at', to_char(now() at time zone 'UTC', 'Mon DD, YYYY · HH:MI AM'),
    'generated_at_tz', 'UTC',

    -- Date range echo (null for 10r)
    'start_date', case when v_start is not null then v_start::text else null end,
    'end_date', case when v_end is not null then v_end::text else null end,

    -- Aggregates (new)
    'total_workouts', (
      select count(distinct workout_id) from scoped_rolls
    ),
    'total_rolls', (
      select count(*) from scoped_rolls
    ),
    'total_techniques', (
      select count(*)
      from (
        select distinct unnest(technique_ids) as tid
        from scoped_rolls
        where array_length(technique_ids, 1) > 0
      ) distinct_techniques
    ),

    -- last_techniques: top 10 from technique_practice_log
    -- Wrapped in {rows: [...]} per dashboard.types.ts
    'last_techniques', jsonb_build_object(
      'rows', coalesce((
        select jsonb_agg(row_to_json)
        from (
          select jsonb_build_object(
            'technique_id', t.id,
            'technique_name', t.name,
            'category', t.category,
            'last_practiced_at', tpl.last_practiced_at::text,
            'practice_count', tpl.total_practices
          ) as row_to_json
          from public.technique_practice_log tpl
          join public.bjj_techniques t on t.id = tpl.technique_id
          where tpl.user_id = v_user_id
            and (
              (p_window = '10r' and tpl.last_practiced_at >= (
                select max(performed_at) from (
                  select w.performed_at
                  from public.workouts w
                  where w.user_id = v_user_id
                    and w.type = 'bjj'
                    and exists (
                      select 1 from public.bjj_roll_events re
                      where re.workout_id = w.id and re.status = 'confirmed'
                    )
                  order by w.performed_at desc
                  limit v_limit
                ) last_n
              ))
              or (p_window <> '10r' and tpl.last_practiced_at::date >= v_start)
            )
          order by tpl.last_practiced_at desc
          limit 10
        ) rows
      ), '[]'::jsonb)
    ),

    -- technique_types: per-category counts from bjj_section_techniques
    -- Returns {total, segments, insights} per dashboard.types.ts
    'technique_types', (
      with tech_counts as (
        select
          t.category,
          count(*) as count
        from public.bjj_section_techniques st
        join public.bjj_sections s on s.id = st.section_id
        join public.workouts w on w.id = s.workout_id
        join public.bjj_techniques t on t.id = st.technique_id
        where w.user_id = v_user_id
          and w.type = 'bjj'
          and (
            (p_window = '10r' and w.id in (
              select w2.id from public.workouts w2
              where w2.user_id = v_user_id and w2.type = 'bjj'
                and exists (
                  select 1 from public.bjj_roll_events re
                  where re.workout_id = w2.id and re.status = 'confirmed'
                )
              order by w2.performed_at desc
              limit v_limit
            ))
            or (p_window <> '10r' and w.performed_at::date >= v_start)
          )
        group by t.category
      ),
      total_count as (select coalesce(sum(count), 0) as n from tech_counts)
      select jsonb_build_object(
        'total', (select n from total_count),
        'segments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'category', category,
            'pct', case when (select n from total_count) = 0 then 0
                        else round(100.0 * count / (select n from total_count))::int end,
            'count', count
          ))
          from tech_counts
        ), '[]'::jsonb),
        'insights', '[]'::jsonb
      )
    ),

    -- role_balance: aggregates from scoped_rolls
    -- Returns {segments, total_rolls} per dashboard.types.ts
    'role_balance', (
      with rb as (
        select role::text as role, count(*) as count
        from scoped_rolls
        group by role
      ),
      total_rolls as (select count(*) from scoped_rolls)
      select jsonb_build_object(
        'segments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'role', role,
            'pct', case when (select count from total_rolls) = 0 then 0
                        else round(100.0 * count / (select count from total_rolls))::int end,
            'count', count
          ) order by role)
          from rb
        ), '[]'::jsonb),
        'total_rolls', (select count from total_rolls)
      )
    ),

    -- outcomes: aggregates from scoped_rolls
    -- Returns {tiles, total_rolls} per dashboard.types.ts
    'outcomes', (
      with oc as (
        select outcome::text as outcome, count(*) as count
        from scoped_rolls
        group by outcome
      ),
      total_rolls as (select count(*) from scoped_rolls)
      select jsonb_build_object(
        'tiles', coalesce((
          select jsonb_agg(jsonb_build_object(
            'outcome', outcome,
            'count', count,
            'pct', case when (select count from total_rolls) = 0 then 0
                        else round(100.0 * count / (select count from total_rolls))::int end
          ) order by outcome)
          from oc
        ), '[]'::jsonb),
        'total_rolls', (select count from total_rolls)
      )
    ),

    -- roll_flow: top 7 transitions from scoped_rolls
    -- Returns {edges, total_transitions, total_rolls, top_n} per dashboard.types.ts
    'roll_flow', (
      with rf as (
        select
          position_from,
          position_to,
          count(*) as count
        from scoped_rolls
        where position_to is not null
        group by position_from, position_to
      ),
      maxed as (select coalesce(max(count), 0) as m from rf),
      total_rolls as (select count(*) from scoped_rolls)
      select jsonb_build_object(
        'edges', coalesce((
          select jsonb_agg(edge_obj)
          from (
            select jsonb_build_object(
              'from', position_from,
              'to', position_to,
              'count', count,
              'pct', case when (select m from maxed) = 0 then 0
                          else round(100.0 * count / (select m from maxed))::int end
            ) as edge_obj
            from rf
            order by count desc
            limit 7
          ) top_edges
        ), '[]'::jsonb),
        'total_transitions', (select count(*) from rf),
        'total_rolls', (select count from total_rolls),
        'top_n', 7
      )
    )
  ) into v_payload;

  return v_payload;
end;
$$;

-- Grant: authenticated only (no PUBLIC — would leak user data to anon)
revoke all on function public.bjj_dashboard_data(text, date, date) from public;
grant execute on function public.bjj_dashboard_data(text, date, date) to authenticated;
