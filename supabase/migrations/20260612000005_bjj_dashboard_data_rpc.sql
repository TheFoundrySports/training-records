-- =========================================================
-- bjj_dashboard_data RPC — composes the 3 bjj_dashboard_* views
-- (PR 1) and the technique_practice_log aggregate into the
-- BJJDashboardData JSON shape (PRD §6.11, design §4).
-- Refs: REQ-RE5 (openspec/changes/bjj-evolution-dashboard/specs/bjj-roll-events/spec.md)
-- =========================================================
-- DEFENSIVE NOTE (per orchestrator brief):
--   This migration has NOT been executed against real Postgres.
--   The repo has no staging environment. The user is the first to
--   run `supabase db reset` against a real instance. The structural
--   Vitest test in src/__tests__/db/bjj-dashboard-data-rpc.test.ts
--   asserts the function signature, security model, window resolution,
--   aggregation source, and return shape — but it does NOT run the SQL.
--   First smoke test: `select public.bjj_dashboard_data('30d');` against
--   a real Postgres instance. Expected behavior: returns a jsonb object
--   with title / subtitle / generated_at / last_techniques /
--   technique_types / role_balance / outcomes / roll_flow.
-- =========================================================
-- LOCKED DECISIONS (per orchestrator preflight):
--   - SECURITY DEFINER, uses auth.uid() ONLY — no p_user_id parameter
--   - The 3 views already filter status='confirmed' AND w.type='bjj'
--     (migration 3), so the RPC does NOT re-filter; it composes the
--     views directly
--   - Window resolution: 7d/30d/90d → date range; 10r → last 10
--     workouts with >=1 confirmed roll
--   - Errors raise P0001 (Postgres standard raise exception code) so
--     the client can map the error to a toast via useEffect
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
  -- Auth gate (RE5: no p_user_id param; auth.uid() only)
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

  -- Compose BJJDashboardData (PRD §6.11)
  v_payload := jsonb_build_object(
    'title',
      'BJJ Evolution Dashboard',
    'subtitle',
      'Your game over the selected window: techniques, role balance, and how your rolls end.',
    'generated_at',
      to_char(now() at time zone 'UTC', 'Mon DD, YYYY · HH:MI AM'),

    -- ── last_techniques: top 10 from technique_practice_log
    --    joined to bjj_techniques for name + category.
    --    category_label + last_label are filled client-side per
    --    design §3.4 (the SQL helper-function path was deferred to
    --    keep the migration simple; client has the source of truth).
    'last_techniques', (
      select coalesce(jsonb_agg(row_to_json), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'name', t.name,
          'category', t.category,
          'category_label', null,
          'count', tpl.total_practices,
          'last_label', null,
          'last_practiced_at', tpl.last_practiced_at
        ) as row_to_json
        from public.technique_practice_log tpl
        join public.bjj_techniques t on t.id = tpl.technique_id
        where tpl.user_id = v_user_id
          and (
            -- 10r: filter to last N workouts with >=1 confirmed roll
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
            -- 7d/30d/90d: filter to date range
            or (p_window <> '10r' and tpl.last_practiced_at::date >= v_start)
          )
        order by tpl.last_practiced_at desc
        limit 10
      ) rows
    ),

    -- ── technique_types: per-category counts from bjj_section_techniques
    --    via bjj_sections → workouts. Color + insight_rows are filled
    --    client-side from material-tokens.
    'technique_types', (
      select jsonb_build_object(
        'total', count(distinct t.category),
        'legend', coalesce(jsonb_agg(distinct jsonb_build_object(
          'label', t.category,
          'color', null,
          'pct', 0
        )), '[]'::jsonb),
        'insight_rows', '[]'::jsonb
      )
      from public.bjj_section_techniques st
      join public.bjj_sections s on s.id = st.section_id
      join public.workouts w on w.id = s.workout_id
      join public.bjj_techniques t on t.id = st.technique_id
      where w.user_id = v_user_id
        and w.type = 'bjj'
        and (
          p_window = '10r'
          or w.performed_at::date >= v_start
        )
    ),

    -- ── role_balance: aggregates from bjj_dashboard_role_balance
    --    (view already filters status='confirmed' AND w.type='bjj')
    'role_balance', (
      with rb as (
        select role::text as role, event_count
        from public.bjj_dashboard_role_balance
        where user_id = v_user_id
      ),
      total_rolls as (select coalesce(sum(event_count), 0) as n from rb)
      select jsonb_build_object(
        'segments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'label', role,
            'color', null,
            'pct', case when (select n from total_rolls) = 0 then 0
                        else round(100.0 * event_count / (select n from total_rolls))::int end
          ) order by role)
          from rb
        ), '[]'::jsonb),
        'legend', coalesce((
          select jsonb_agg(jsonb_build_object(
            'label', role,
            'color', null,
            'pct', case when (select n from total_rolls) = 0 then 0
                        else round(100.0 * event_count / (select n from total_rolls))::int end
          ) order by role)
          from rb
        ), '[]'::jsonb)
      )
    ),

    -- ── outcomes: aggregates from bjj_dashboard_outcomes
    'outcomes', (
      with oc as (
        select outcome::text as outcome, event_count
        from public.bjj_dashboard_outcomes
        where user_id = v_user_id
      ),
      total_rolls as (select coalesce(sum(event_count), 0) as n from oc)
      select jsonb_build_object(
        'tiles', coalesce((
          select jsonb_agg(jsonb_build_object(
            'label', outcome,
            'color', null,
            'pct', case when (select n from total_rolls) = 0 then 0
                        else round(100.0 * event_count / (select n from total_rolls))::int end,
            'n', event_count
          ) order by outcome)
          from oc
        ), '[]'::jsonb)
      )
    ),

    -- ── roll_flow: top 7 transitions from bjj_dashboard_position_transitions
    --    LEFT JOIN bjj_positions for display labels (REQ-PV1)
    'roll_flow', (
      with rf as (
        select
          r.position_from,
          r.position_to,
          r.transition_count,
          pf.display_en as from_en,
          pt.display_en as to_en
        from public.bjj_dashboard_position_transitions r
        left join public.bjj_positions pf on pf.key = r.position_from
        left join public.bjj_positions pt on pt.key = r.position_to
        where r.user_id = v_user_id
      ),
      maxed as (select coalesce(max(transition_count), 0) as m from rf)
      select jsonb_build_object(
        'total_rolls', (select coalesce(sum(transition_count), 0) from rf),
        'total_transitions', (select count(*) from rf),
        'top_n', 7,
        'edges', coalesce((
          select jsonb_agg(edge_obj)
          from (
            select jsonb_build_object(
              'from', from_en,
              'to', to_en,
              'count', transition_count,
              'pct', case when (select m from maxed) = 0 then 0
                          else round(100.0 * transition_count / (select m from maxed))::int end,
              'color', null
            ) as edge_obj
            from rf
            order by transition_count desc
            limit 7
          ) top_edges
        ), '[]'::jsonb)
      )
    )
  );

  return v_payload;
end;
$$;

-- Grant: authenticated only (no PUBLIC — would leak user data to anon)
revoke all on function public.bjj_dashboard_data(text, date, date) from public;
grant execute on function public.bjj_dashboard_data(text, date, date) to authenticated;
