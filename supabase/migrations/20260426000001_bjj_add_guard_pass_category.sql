-- =========================================================
-- Add 'guard_pass' to bjj_techniques category CHECK constraint
-- =========================================================

alter table public.bjj_techniques
  drop constraint if exists bjj_techniques_category_check;

alter table public.bjj_techniques
  add constraint bjj_techniques_category_check
    check (category in ('guard', 'takedown', 'submission', 'escape', 'transition', 'guard_pass', 'other'));
