-- =========================================================
-- bjj_positions — canonical position vocabulary (11 keys from PRD §6.7)
-- Refs: REQ-PV1 / REQ-PV2 / REQ-PV8 (openspec/changes/bjj-evolution-dashboard/specs/bjj-position-vocabulary/spec.md)
-- =========================================================
-- Lookup table. Read-only for authenticated users; service role / migration
-- scripts are the only writers (no client write policy per REQ-PV8).
-- =========================================================
create table if not exists public.bjj_positions (
  key           text primary key,
  display_en    text not null,
  display_es    text not null,
  display_order int  not null
);

-- =========================================================
-- RLS: read-only for authenticated (REQ-PV8)
-- =========================================================
alter table public.bjj_positions enable row level security;

create policy "Authenticated users can read bjj_positions"
  on public.bjj_positions for select
  using (auth.role() = 'authenticated');
-- No INSERT/UPDATE/DELETE policy → only service role / migration can write.

-- =========================================================
-- Seed (REQ-PV2): 11 canonical keys, EN + ES labels.
-- Idempotent: ON CONFLICT (key) DO NOTHING.
-- =========================================================
insert into public.bjj_positions(key, display_en, display_es, display_order) values
  ('standing',         'Standing',          'De pie',                  1),
  ('closed_guard',     'Closed guard',      'Guardia cerrada',         2),
  ('open_guard',       'Open guard',        'Guardia abierta',         3),
  ('half_guard',       'Half guard',        'Media guardia',           4),
  ('side_control',     'Side control',      'Control lateral',         5),
  ('mount',            'Mount',             'Montada',                 6),
  ('back_control',     'Back control',      'Control de espalda',      7),
  ('turtle',           'Turtle',            'Tortuga',                 8),
  ('knee_on_belly',    'Knee on belly',     'Rodilla en el estómago',  9),
  ('leg_entanglement', 'Leg entanglement',  'Enredo de piernas',      10),
  ('other',            'Other',             'Otro',                   11)
on conflict (key) do nothing;
