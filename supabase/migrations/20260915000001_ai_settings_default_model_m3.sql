-- ============================================================================
-- Update default AI model from MiniMax-M2.7 to MiniMax-M3
-- ----------------------------------------------------------------------------
-- Keeps the seeded ai_settings row in sync with the new source defaults in:
--   - supabase/seed.sql
--   - supabase/functions/bjj-section-ai/index.ts (fallback)
--   - supabase/functions/workout-notes-ai/index.ts (fallback)
--   - docs/CODE_REFERENCE.md
--
-- Targets the canonical single-row id enforced by the ai_settings_single_row
-- CHECK constraint (20260427000001_create_ai_settings.sql). Idempotent: the
-- `model <> 'MiniMax-M3'` guard turns this into a no-op when production has
-- already been updated, and prevents the ai_settings_updated_at trigger from
-- firing an unnecessary change.
-- ============================================================================

update public.ai_settings
   set model = 'MiniMax-M3'
 where id = '00000000-0000-0000-0000-000000000001'
   and model <> 'MiniMax-M3';
