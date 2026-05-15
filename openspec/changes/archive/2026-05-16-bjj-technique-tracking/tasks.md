# Tasks: BJJ Technique Tracking & Learning Validation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1150–1350 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (DB + Edge) → PR 2 (Hooks + Types) → PR 3 (Components + Integration) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

## Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | DB migrations (4 files) + Edge Function prompt change | PR 1 | Base = main; all DB work, no frontend |
| 2 | Type definitions + 3 new hooks (TDD: write tests first) | PR 2 | Base = main; pure data layer, no UI |
| 3 | 3 new components + modified ProgressionChecklistItem + BeltProgressionPage integration + tests | PR 3 | Base = main; all UI + wiring |

---

## Phase 1: Database Migrations

- [x] 1.1 Create `supabase/migrations/20260514000001_technique_practice_log.sql` — `technique_practice_log` table with indexes, `set_technique_practice_log_updated_at` function, RLS policy, `update_technique_practice_log` trigger function, and `technique_practice_log_trigger` on `bjj_section_techniques` AFTER INSERT
- [x] 1.2 Create `supabase/migrations/20260514000002_technique_learning_thresholds.sql` — `technique_learning_thresholds` table with unique constraint on `technique_id`, indexes, updated_at trigger, and RLS policies (authenticated read, service_role write)
- [x] 1.3 Create `supabase/migrations/20260514000003_technique_learning_status.sql` — `technique_learning_status` view joining `technique_practice_log` + `bjj_techniques` + `technique_learning_thresholds` with `coalesce(required_practices, 10)` and `is_learned` computed column
- [x] 1.4 Create `supabase/migrations/20260514000004_backfill_practice_log.sql` — one-time backfill using `INSERT ... ON CONFLICT DO NOTHING` aggregating `count(*)` per `(user_id, technique_id)` from existing `bjj_section_techniques` rows

## Phase 2: Edge Function — AI Prompt Update

- [x] 2.1 Modify `supabase/functions/bjj-section-ai/prompt.ts` — append bracketing instruction block after line 32 (after "Technique catalog:") instructing AI to append `[Canonical Name]` in square brackets after each technique mention, referencing only "name" field from catalog, only bracketing confident detections

## Phase 3: Type Definitions

- [x] 3.1 (TDD) Write `src/features/bjj/progression/__tests__/technique-tracking.types.test.ts` — test `TechniqueLearningStatus`, `WorkoutHistoryEntry`, `TechniqueSuggestion` interfaces
- [x] 3.2 Create `src/features/bjj/progression/types/technique-tracking.types.ts` — export `TechniqueLearningStatus`, `WorkoutHistoryEntry`, `TechniqueSuggestion` interfaces

## Phase 4: New Hooks (TDD-first)

- [x] 4.1 (TDD) Write `src/features/bjj/progression/__tests__/useTechniqueLearningStatus.test.ts` — mock Supabase client, assert query returns `TechniqueLearningStatus[]`, staleTime = 60s, correct table/filter
- [x] 4.2 Create `src/features/bjj/progression/hooks/useTechniqueLearningStatus.ts` — `useQuery` on `technique_learning_status` view filtered by `user_id`, returns `TechniqueLearningStatus[]`, staleTime 60s
- [x] 4.3 (TDD) Write `src/features/bjj/progression/__tests__/useTechniqueWorkoutHistory.test.tsx` — mock Supabase, assert joins `bjj_section_techniques → bjj_sections → workouts`, filtered by `(technique_id, user_id)`, ordered by `performed_at desc`, limit 20
- [x] 4.4 Create `src/features/bjj/progression/hooks/useTechniqueWorkoutHistory.ts` — `useQuery` joining `bjj_section_techniques → bjj_sections → workouts`, filtered/ordered as above, returns `WorkoutHistoryEntry[]`, staleTime 30s
- [x] 4.5 (TDD) Write `src/features/bjj/progression/__tests__/useTechniqueSuggestions.test.tsx` — mock Supabase, assert query filters `last_practiced_at > now() - 30 days`, joins `bjj_techniques` + `belt_progression` excluding completed items, limit 5, ordered by `last_practiced_at desc`
- [x] 4.6 Create `src/features/bjj/progression/hooks/useTechniqueSuggestions.ts` — `useQuery` for last-30-day practiced techniques not in `belt_progression` (blue belt), max 5, ordered by `last_practiced_at desc`, returns `TechniqueSuggestion[]`, staleTime 30s

## Phase 5: New Components

- [x] 5.1 (TDD) Write `src/features/bjj/progression/__tests__/TechniquePracticeBadge.test.tsx` — test color coding (gray/amber/green), aria-label, onClick propagation
- [x] 5.2 Create `src/features/bjj/progression/components/TechniquePracticeBadge.tsx` — props: `count: number`, `threshold: number`, `isLearned: boolean`, `onClick: () => void`; color: gray (0), amber (0 < count < threshold), green (count >= threshold); aria-label with count/threshold/validation
- [x] 5.3 (TDD) Write `src/features/bjj/progression/__tests__/TechniquePracticeModal.test.tsx` — test Dialog renders, workout list display, link navigation, close behavior
- [x] 5.4 Create `src/features/bjj/progression/components/TechniquePracticeModal.tsx` — `Dialog` from shadcn/ui, props: `techniqueId`, `techniqueName`, `open`, `onClose`; uses `useTechniqueWorkoutHistory`; renders Card per workout (date, goal, truncated ai_description, link to workout detail)
- [x] 5.5 (TDD) Write `src/features/bjj/progression/__tests__/TechniqueSuggestionPanel.test.tsx` — test panel renders up to 5 suggestions, "Mark as Complete" button calls mutation, per-item and global dismiss buttons set localStorage, collapse/expand toggle
- [x] 5.6 Create `src/features/bjj/progression/components/TechniqueSuggestionPanel.tsx` — collapsible card panel, props: `userId`; uses `useTechniqueSuggestions`; "Mark as Complete" calls `useBeltProgression` toggleItem; dismissal via localStorage key `suggestions_dismissed_${userId}`; max 5 items

## Phase 6: Modified Components

- [x] 6.1 (TDD) Write `src/features/bjj/progression/__tests__/ProgressionChecklistItem.test.tsx` — test `practiceData` prop renders `TechniquePracticeBadge` inline, badge onClick opens modal
- [x] 6.2 Modify `src/features/bjj/progression/components/ProgressionChecklistItem.tsx` — add optional `practiceData?: { count: number; threshold: number; isLearned: boolean } | null` prop; when present, render `TechniquePracticeBadge` inline after label; pass `onClick` to badge; make row clickable → opens `TechniquePracticeModal`

## Phase 7: BeltProgressionPage Integration

- [x] 7.1 (TDD) Write `src/features/bjj/progression/__tests__/BeltProgressionPage.technique-tracking.test.tsx` — test suggestion panel mounts above progress bar, Section 2 items show practice badges, badge click opens modal, panel refreshes after "Mark as Complete"
- [x] 7.2 Modify `src/features/bjj/progression/pages/BeltProgressionPage.tsx` — import and call `useTechniqueLearningStatus(userId)` and `useTechniqueSuggestions(userId)`; build `Map<techniqueId, TechniqueLearningStatus>` from status query; at Section 2 render, match `item.label → name_es / name` to lookup techniqueId and pass `practiceData` to `ProgressionChecklistItem`; mount `TechniqueSuggestionPanel` above global progress bar; mount `TechniquePracticeModal` at page root

## Phase 8: Verification

- [ ] 8.1 Run all new vitest tests — all must pass
- [ ] 8.2 Verify migration SQL via `supabase db push --dry-run` or equivalent
- [ ] 8.3 Manual E2E: create BJJ workout → trigger AI enhance → verify `technique_practice_log` rows created → open BeltProgressionPage → assert practice badges render with correct counts → click badge → assert modal shows correct workouts → use suggestion panel "Mark as Complete" → assert panel refreshes