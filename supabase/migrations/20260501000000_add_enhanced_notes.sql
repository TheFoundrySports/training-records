-- Add enhanced_notes column for AI-improved workout notes
alter table public.workouts add column enhanced_notes text;

-- Existing rows get NULL (nullable, no NOT NULL constraint per spec)
-- New workouts can omit enhanced_notes and it will be NULL