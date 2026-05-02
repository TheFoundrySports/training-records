-- Add Spanish name column for bilingual search
alter table public.bjj_techniques add column name_es text;

-- Index for Spanish name searches (GIN trigram for ILIKE)
create index idx_bjj_techniques_name_es_trgm on public.bjj_techniques using gin (name_es gin_trgm_ops);

-- Backfill name_es from name for existing rows
update public.bjj_techniques set name_es = name where name_es is null;