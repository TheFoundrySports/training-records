-- =========================================================
-- technique_learning_status — materialized view joining practice log + thresholds
-- Produces is_learned via coalesce(required_practices, 10) computation
-- Read-only view; not directly writable — use technique_practice_log for writes
-- =========================================================
create or replace view public.technique_learning_status as
select
  tpl.user_id,
  tpl.technique_id,
  t.name,
  t.name_es,
  t.category,
  tpl.total_practices,
  coalesce(tlt.required_practices, 10)        as required_practices,
  (tpl.total_practices >= coalesce(tlt.required_practices, 10)) as is_learned,
  tpl.first_practiced_at,
  tpl.last_practiced_at
from public.technique_practice_log tpl
join public.bjj_techniques t on t.id = tpl.technique_id
left join public.technique_learning_thresholds tlt on tlt.technique_id = tpl.technique_id;

-- =========================================================
-- Verification comments:
--
-- ASSERT: technique_learning_status view exists and is joinable
-- ASSERT: is_learned computes to true when total_practices >= coalesce(required_practices, 10)
-- ASSERT: view includes user_id, technique_id, name, name_es, category from catalog
-- ASSERT: view includes first_practiced_at and last_practiced_at timestamps
-- NOTE: RLS not applied to views — access controlled via underlying technique_practice_log RLS
-- =========================================================