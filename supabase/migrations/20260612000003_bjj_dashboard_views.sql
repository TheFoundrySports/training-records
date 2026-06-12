-- =========================================================
-- bjj_dashboard_* views — pre-aggregated roll metrics for the dashboard
-- Refs: REQ-RE4 (openspec/changes/bjj-evolution-dashboard/specs/bjj-roll-events/spec.md)
-- =========================================================
-- All 3 views filter to r.status = 'confirmed' AND w.type = 'bjj' so that
-- proposed rolls (per the backfill migration) never leak into dashboard
-- aggregates. RLS is inherited from the underlying bjj_roll_events table;
-- no separate policy is granted on the views.
-- =========================================================

create or replace view public.bjj_dashboard_role_balance as
  select
    r.user_id,
    r.role,
    count(*) as event_count
  from public.bjj_roll_events r
  join public.workouts w on w.id = r.workout_id
  where r.status = 'confirmed'
    and w.type = 'bjj'
  group by r.user_id, r.role;

create or replace view public.bjj_dashboard_outcomes as
  select
    r.user_id,
    r.outcome,
    count(*) as event_count
  from public.bjj_roll_events r
  join public.workouts w on w.id = r.workout_id
  where r.status = 'confirmed'
    and w.type = 'bjj'
  group by r.user_id, r.outcome;

create or replace view public.bjj_dashboard_position_transitions as
  select
    r.user_id,
    r.position_from,
    r.position_to,
    count(*) as transition_count
  from public.bjj_roll_events r
  join public.workouts w on w.id = r.workout_id
  where r.status = 'confirmed'
    and w.type = 'bjj'
    and r.position_to is not null
  group by r.user_id, r.position_from, r.position_to;
