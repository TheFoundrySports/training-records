# Tasks: workout-export-import

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~850 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (hooks + tests) → PR 2 (components + wiring) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

**Decision needed before apply**: Yes
**Chained PRs recommended**: Yes
**Chain strategy**: stacked-to-main | feature-branch-chain | size-exception | pending

### Work Units

| Unit | Goal | PR | Base |
|------|------|-----|------|
| 1 | Hooks + tests (T1–T3) | PR 1 | main |
| 2 | Components + wiring (T4–T7) | PR 2 | PR 1 |

---

## Phase 1: Hooks (T1–T3)

- [ ] **T1**: `useExportWorkout` hook + unit tests
  - Create `src/features/workouts/hooks/useExportWorkout.ts`
  - Create `src/features/workouts/hooks/useExportWorkout.test.ts`
  - Hook: fetch workout by ID, fetch BJJ sections via nested select, build JSON, trigger download via `URL.createObjectURL`
  - Tests: verify JSON shape (version, fields, sections), filename slugify, error on missing workout

- [ ] **T2**: `useExportAllWorkouts` hook + unit tests
  - Create `src/features/workouts/hooks/useExportAllWorkouts.ts`
  - Create `src/features/workouts/hooks/useExportAllWorkouts.test.ts`
  - Hook: fetch all workouts ordered by `performed_at`, fetch BJJ sections per workout via `Promise.all`, build root `{version, exportedAt, workouts[]}`, trigger download
  - Tests: verify root structure, empty array case, section nesting per type

- [ ] **T3**: `useImportWorkouts` hook + unit tests
  - Create `src/features/workouts/hooks/useImportWorkouts.ts`
  - Create `src/features/workouts/hooks/useImportWorkouts.test.ts`
  - Hook: `file.text()` → `JSON.parse` → validate `version === 1`, sequential inserts for workouts + BJJ sections + technique junction, technique name matching, `queryClient.invalidateQueries`
  - Tests: version validation error, BJJ technique name matching (found + not found), auth error, insert count
  - **Note**: Import uses sequential mutations (not bulk insert) to get inserted IDs for section linking

---

## Phase 2: Components (T4–T5)

- [ ] **T4**: `ExportWorkoutButton` component
  - Create `src/features/workouts/components/ExportWorkoutButton.tsx`
  - Props: `workoutId`, `className?`, `variant?`, `size?`
  - Wraps `useExportWorkout`; renders `Button` with `Download` icon; shows spinner/disabled while `isPending`

- [ ] **T5**: `ExportAllWorkoutsButton` + `ImportWorkoutsModal` components
  - Create `src/features/workouts/components/ExportAllWorkoutsButton.tsx`
  - Create `src/features/workouts/components/ImportWorkoutsModal.tsx`
  - `ExportAllWorkoutsButton`: wraps `useExportAllWorkouts`; `Button` with `Download` icon + "Export All" label
  - `ImportWorkoutsModal`: `Dialog` with `<input type="file" accept=".json">`, "Import" button, success/error/idle states, calls `useImportWorkouts.mutateAsync`

---

## Phase 3: Wiring (T6–T7)

- [ ] **T6**: Wire `ExportWorkoutButton` into `WorkoutDetailPage`
  - Modify `src/features/workouts/pages/WorkoutDetailPage.tsx`
  - Add `ExportWorkoutButton` in page header or actions area; pass `workout.id`

- [ ] **T7**: Wire `ExportAllWorkoutsButton` + `ImportWorkoutsModal` into `WorkoutListPage`
  - Modify `src/features/workouts/pages/WorkoutListPage.tsx`
  - Add `ExportAllWorkoutsButton` in page header; add `ImportWorkoutsModal` with trigger button

---

## Acceptance Criteria

| Task | Criteria |
|------|----------|
| T1 | Export single BJJ workout → JSON downloaded with sections + techniques; crossfit → wodFormat/wodText/payload |
| T2 | Export all → root `{version, exportedAt, workouts[]}` with all workouts; empty list → `{"workouts": []}` |
| T3 | Version mismatch → throws `{code: 'UNSUPPORTED_VERSION'}`. Unmatched technique name → silently skipped. Section still created. Returns count. |
| T4 | Button disabled/spinner while exporting; click triggers download immediately |
| T5 | Modal: idle → file selected → importing → success (N imported) OR error (message + retry). Close resets to idle. |
| T6 | `WorkoutDetailPage` shows Export button; export works end-to-end |
| T7 | `WorkoutListPage` shows Export All + Import buttons; import creates rows and refreshes list |

---

## File Manifest

| File | Action |
|------|--------|
| `src/features/workouts/hooks/useExportWorkout.ts` | create |
| `src/features/workouts/hooks/useExportWorkout.test.ts` | create |
| `src/features/workouts/hooks/useExportAllWorkouts.ts` | create |
| `src/features/workouts/hooks/useExportAllWorkouts.test.ts` | create |
| `src/features/workouts/hooks/useImportWorkouts.ts` | create |
| `src/features/workouts/hooks/useImportWorkouts.test.ts` | create |
| `src/features/workouts/components/ExportWorkoutButton.tsx` | create |
| `src/features/workouts/components/ExportAllWorkoutsButton.tsx` | create |
| `src/features/workouts/components/ImportWorkoutsModal.tsx` | create |
| `src/features/workouts/pages/WorkoutDetailPage.tsx` | modify |
| `src/features/workouts/pages/WorkoutListPage.tsx` | modify |

**Total files**: 9 new, 2 modified