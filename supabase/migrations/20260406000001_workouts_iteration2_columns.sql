-- Add iteration 2 columns to workouts table (all nullable, backward-compatible)
alter table public.workouts
  add column if not exists wod_format text
    check (wod_format in ('amrap', 'for_time', 'emom', 'tabata', 'ladder', 'rft')),
  add column if not exists wod_text  text,
  add column if not exists payload   jsonb;

comment on column public.workouts.wod_format is 'WOD format type (amrap, for_time, emom, tabata, ladder, rft)';
comment on column public.workouts.wod_text   is 'Free-text WOD description (paste or manual entry)';
comment on column public.workouts.payload    is 'Per-format structured data (movements, time cap, score config) as JSONB';
