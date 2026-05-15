# Proposal: BJJ Technique Tracking & Learning Validation

## Intent

Enhance the existing BJJ AI-enhanced workout feature to create a data-driven progression system: explicit technique naming in AI output (bracketed canonical names), practice frequency tracking per technique, configurable learning thresholds, and practice counters surfaced in the Blue Belt Progression Tracker. The goal is objective validation backed by workout history, replacing self-assessment alone.

## Scope

### In Scope
- AI prompt update: append `[Canonical Name]` after technique mentions in `ai_description`
- Backend parsing: extract bracketed names → match to `bjj_techniques.id` → store in `bjj_section_techniques`
- `technique_practice_log` table + DB trigger for real-time practice count aggregation
- `technique_learning_thresholds` table (schema only; admin UI deferred to post-MVP)
- `technique_learning_status` view joining practice log + thresholds
- Historical backfill: one-time migration to populate practice log from existing junction table data
- Practice counter badges on Blue Belt Progression Tracker (Section 2 items)
- `TechniqueSuggestionPanel` at top of progression page (last 30 days, ≤5 items)
- `TechniquePracticeModal`: workout history per technique

### Out of Scope
- Coach visibility / RLS for `technique_practice_log` (deferred to Iteration 7.1)
- Admin UI for threshold configuration (deferred to Iteration 7.2)
- Multi-belt support beyond blue belt
- Hard validation blocking progression item marking
- Technique dependencies or learning paths

## Capabilities

### New Capabilities
- `technique-practice-tracking`: Tracks practice frequency per user per technique via trigger on `bjj_section_techniques`
- `technique-learning-validation`: Determines if a technique is "learned" based on configurable threshold
- `technique-suggestion-panel`: Surfaces recently practiced techniques not yet in progression tracker

### Modified Capabilities
- `bjj-workout-ai-enhancement`: AI output now includes machine-parseable bracketed canonical names

## Approach

### AI Prompt Update
Update `prompt.ts` to instruct the model to append `[Canonical Name]` after each technique mention. Backend uses regex `/\[([^\]]+)\]/g` to extract names, matches to `bjj_techniques.name`, and stores UUIDs in the existing junction table.

### Progression Item → Technique ID Mapping: Runtime Name Lookup
The 31 items in Section 2 of `PROGRESSION_SECTIONS` use Spanish labels. At render time, match `item.label` against `bjj_techniques.name_es` or `name` to look up `techniqueId`. No changes to `PROGRESSION_SECTIONS` constant — keeps the static file untouched. Performance: N=31 items × O(1) lookup via Map built from catalog query. Alternative (static `techniqueId` field) was rejected to avoid duplicating data across files.

### DB Trigger for Practice Count
Trigger fires `AFTER INSERT ON bjj_section_techniques`. Upserts `technique_practice_log` — increments `total_practices`, updates `last_practiced_at`. `first_practiced_at` set only on insert. No race conditions due to row-level locking.

### Historical Backfill
Run once after trigger deployment via `20260514000004_backfill_practice_log.sql`. Uses `INSERT ... ON CONFLICT DO NOTHING` to avoid duplicates. Safe to re-run — idempotent.

### Materialized View Decision
Defer `technique_practice_workouts` MV unless workout history modal proves slow. Direct join query is sufficient for MVP (N+1 via `technique_learning_status` view is <500ms for typical datasets). MV can be added as a perf optimization without API changes.

### RLS Design (Future-Ready)
`technique_practice_log` uses `user_id` FK to `auth.users`. RLS policies for coach visibility should be designed with a `coach_athlete_permissions` join in mind (see PRD §6.6). Table schema is compatible; policy creation deferred to Iteration 7.1.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/functions/bjj-section-ai/prompt.ts` | Modified | Add bracketing instruction to system prompt |
| `supabase/migrations/` | New | 4 migration files: practice_log, thresholds, view, backfill |
| `supabase/migrations/*_technique_practice_log_trigger.sql` | New | Trigger + function on `bjj_section_techniques` |
| `src/features/bjj/hooks/useTechniqueLearningStatus.ts` | New | Fetch `technique_learning_status` view |
| `src/features/bjj/hooks/useTechniqueWorkoutHistory.ts` | New | Fetch workouts per technique |
| `src/features/bjj/hooks/useTechniqueSuggestions.ts` | New | Fetch last-30-day practiced techniques |
| `src/features/bjj/components/TechniquePracticeBadge.tsx` | New | Inline counter badge |
| `src/features/bjj/components/TechniquePracticeModal.tsx` | New | Workout history dialog |
| `src/features/bjj/components/TechniqueSuggestionPanel.tsx` | New | Suggestion card panel |
| `src/features/bjj/pages/BeltProgressionPage.tsx` | Modified | Add practice badges + suggestion panel |
| `src/features/bjj/components/ProgressionChecklistItem.tsx` | Modified | Accept + render `practiceData` prop |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| AI bracketing false positives | Medium | Conservative prompt: "only bracket if confident"; athletes can remove techniques manually |
| Historical backfill slow on large datasets | Low | Run as async migration with no locking; verify with `EXPLAIN ANALYZE` |
| Progression badge lookup performance | Low | Runtime Map lookup is O(1); catalog has ~50 rows, not 1000+ |
| Mock AI mode bypasses trigger | Low | Acceptable for dev; real AI calls trigger correctly |

## Rollback Plan

1. **DB**: Roll back migrations via `supabase/migrations/` revert — drop trigger, then tables (reverse order of creation). Backfill data is lost; re-populated on next normal workout.
2. **Edge Function**: Revert `prompt.ts` changes via git — prompt template is the only modification.
3. **Frontend**: Revert component changes via git — new components are isolated; modified components (`ProgressionChecklistItem`, `BeltProgressionPage`) have additive changes only.
4. No destructive data loss — `bjj_section_techniques` is unchanged; practice log is derived and rebuildable.

## Dependencies

- Iteration 6 Blue Belt Progression Tracker must be deployed
- `bjj_techniques` catalog must have all blue belt techniques seeded (~32 rows)
- AI enhance feature functional (MiniMax or OpenAI configured)

## Success Criteria

- [ ] AI-enhanced descriptions include bracketed canonical names (regex-extractable)
- [ ] `technique_practice_log` row created/updated correctly on workout save (E2E verified)
- [ ] Historical backfill completes — query `technique_practice_log` returns counts for existing workouts
- [ ] Practice counter badge shows correct count/threshold color coding on progression page
- [ ] `TechniqueSuggestionPanel` appears at top of progression page with ≤5 recent techniques
- [ ] Clicking badge opens modal with correct workout history per technique
- [ ] p95 latency for `technique_learning_status` query < 500ms