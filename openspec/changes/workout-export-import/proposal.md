# Proposal: workout-export-import

## Intent

Allow users to export their workout history (with all sections and techniques) as versioned JSON, and re-import it later — enabling portability and backup of their training data.

## Scope

### In Scope
- Export single workout (workout detail page: "Export" button → JSON download)
- Export all workouts (workouts list page: "Export All" button → JSON download)
- Import from JSON (workouts list page: modal with file picker)
- JSON format versioned (`"version": 1`)
- BJJ workouts: includes `bjj_sections` array, each with nested `bjj_section_techniques` (matched by technique `name` on import)
- CrossFit/functional workouts: includes `wod_format` and `wod_text` and `payload`
- Imported `userId` field is ignored; import always uses `auth.uid()` of the importing user

### Out of Scope
- Server-side export endpoint (client-side only)
- Pagination or streaming for large exports
- Import conflict resolution UI (duplicates create new workout rows)
- Creating new BJJ techniques on import (unmatched techniques are omitted)

## Approach

Client-side only. No new API endpoints.

1. **Export single**: fetch workout + BJJ sections via existing hooks → `JSON.stringify` → `URL.createObjectURL` → trigger download
2. **Export all**: fetch all user workouts (no nested sections) → `JSON.stringify` → download
3. **Import**: parse JSON via `FileReader` → validate schema + version → upsert workout row → for BJJ, lookup each technique by `name` in `bjj_techniques` table → insert `bjj_sections` + junction records; unmatched technique names are silently skipped → set `user_id` from `auth.uid()`

**JSON shape**:
```json
{
  "version": 1,
  "exportedAt": "2026-05-18T...",
  "workouts": [
    {
      "type": "bjj|crossfit|functional",
      "title": "...",
      "performedAt": "...",
      "durationMin": 60,
      "notes": "...",
      "sections": [{ "order": 1, "name": "...", "techniques": ["Mount Control", ...] }],
      "wodFormat": null,
      "wodText": null,
      "payload": null
    }
  ]
}
```

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/workouts/pages/WorkoutDetailPage.tsx` | Modified | Add "Export" button |
| `src/features/workouts/pages/WorkoutListPage.tsx` | Modified | Add "Export All" button + Import modal |
| `src/features/workouts/` (new) | New | `exportWorkout.ts`, `exportAllWorkouts.ts`, `importWorkouts.ts` utilities |
| `src/features/workouts/` (new) | New | `ImportWorkoutsModal.tsx` component |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| BJJ technique ID mismatch on import (name not found) | Medium | Unmatched techniques are silently omitted; row still created |
| Duplicate imports create new rows (no dedup) | Low | Acceptable for v1; future enhancement could add dedup logic |
| Large export causes memory issue | Low | Fetch in batches if needed; unlikely to hit limits in practice |
| JSON.parse validates version incorrectly | Low | Version field checked; parse fails cleanly on unknown version |

## Rollback Plan

- Feature flag: remove the export/import buttons and modal
- Migration: no schema changes; rollback is code-only
- Revert: `git revert` the changes to `WorkoutDetailPage`, `WorkoutListPage`, and remove new utility files

## Dependencies

- Supabase `auth.uid()` available in client (authenticated session required)
- Existing `useWorkouts`, `useBJJWorkoutSections` hooks continue to work

## Success Criteria

- [ ] "Export" button on workout detail page downloads valid JSON
- [ ] "Export All" button on list page downloads all user workouts as JSON
- [ ] Import modal parses exported JSON and creates workout rows in DB
- [ ] BJJ technique sections are recreated with correct technique links (name matched)
- [ ] Imported `userId` is ignored; `auth.uid()` is used as owner
- [ ] Invalid JSON or wrong version shows user-facing error
- [ ] Unit tests cover export JSON shape and import validation

## Capabilities

### New Capabilities

- `workout-export`: Download a single workout or all workouts as versioned JSON
- `workout-import`: Parse exported JSON and recreate workout rows with BJJ section structure