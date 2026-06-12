-- =========================================================
-- Historical backfill: propose status='proposed' placeholder rows for
-- existing sparring sections so the dashboard can count them in the
-- "X sparring sessions without confirmed roll data" banner (US-49).
-- Refs: REQ-RE9 (openspec/changes/bjj-evolution-dashboard/specs/bjj-roll-events/spec.md)
-- =========================================================
-- Idempotent: ON CONFLICT (section_id, roll_index) DO NOTHING.
--
-- STUB ROW DESIGN
--   The migration runs in pure SQL (no Edge Function, no LLM), so it
--   cannot extract structured roll data. The placeholder row is meant
--   to be overwritten by the next AI enhance of that section in the
--   BJJSectionEditor RollReviewPanel flow (PR 7). Until then, the
--   dashboard banner can count it and the athlete can review/discard.
--   Deterministic locked values:
--     roll_index      = 1
--     role            = 'neutral'
--     outcome         = 'neutral'
--     position_from   = 'other'        (always a valid bjj_positions key)
--     position_to     = null           (no transition observed)
--     technique_ids   = '{}'           (no techniques)
--     confidence      = 0              (zero — see validation_error pattern
--                                       in the AI flow)
--     raw_excerpt     = left(raw_description, 200)
--     status          = 'proposed'
--     source          = 'manual'       (so the rollback / re-run filter
--                                       in design.md §3.5 scopes correctly)
-- =========================================================
insert into public.bjj_roll_events
  (user_id, workout_id, section_id, roll_index,
   role, outcome, position_from, position_to,
   technique_ids, confidence, raw_excerpt, status, source)
select
  w.user_id,
  s.workout_id,
  s.id,
  1                                              as roll_index,
  'neutral'::public.bjj_roll_role                as role,
  'neutral'::public.bjj_roll_outcome             as outcome,
  'other'                                        as position_from,
  null                                           as position_to,
  '{}'                                           as technique_ids,
  0                                              as confidence,
  left(s.raw_description, 200)                   as raw_excerpt,
  'proposed'::public.bjj_roll_event_status       as status,
  'manual'::public.bjj_roll_event_source         as source
from public.bjj_sections s
join public.workouts w on w.id = s.workout_id
where w.type = 'bjj'
  and (
    s.goal            ~* 'sparring|rolls|rondas|libre|posicional'
    or s.raw_description ~* 'sparring|rolls|rondas|libre|posicional'
    or s.ai_description  ~* 'sparring|rolls|rondas|libre|posicional'
  )
  and not exists (
    select 1 from public.bjj_roll_events re where re.section_id = s.id
  )
on conflict (section_id, roll_index) do nothing;
