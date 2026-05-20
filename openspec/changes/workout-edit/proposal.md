# Proposal: workout-edit

## Intent

Allow admins to edit all workouts and athletes to edit only their own workouts. CrossFit/Functional workouts already have partial edit support — the main gaps are admin RLS policies and UI edit button visibility. BJJ workouts need a full edit implementation: new RPC, edit mode on the form page, new route, and admin RLS policies.

## Scope

### In Scope
- **CrossFit/Functional edit**: already wired (`WorkoutFormPage` in edit mode, `useUpdateWorkout`). Needs RLS admin UPDATE policy + fix edit button visibility.
- **BJJ workout edit**: new `bjj_update_workout` RPC, extend `BJJWorkoutFormPage` with edit mode, new route `/bjj/:id/edit`, edit button on `BJJWorkoutDetail`.
- **RLS admin policies**: add admin UPDATE policies to `workouts`, `bjj_sections`, `bjj_section_techniques`.
- **Edit button visibility**: show for owner OR admin on both `WorkoutDetailPage` (non-BJJ) and `BJJWorkoutDetail`.

### Out of Scope
- Bulk edit (edit multiple workouts at once)
- Edit history / audit log
- Conflict resolution for concurrent edits (last-write-wins)
- Editing techniques outside of a BJJ workout context

## Approach

**CrossFit/Functional** — `WorkoutFormPage` already detects edit mode via `id` param and calls `useUpdateWorkout`. No structural changes needed. Two fixes:
1. Add admin UPDATE policy to `workouts` RLS
2. Fix edit button visibility: check `isAdmin || isOwner` instead of just `isOwner`

**BJJ** — Extend the existing creation pattern to support updates:
1. Add admin UPDATE RLS policies to `bjj_sections` and `bjj_section_techniques`
2. Create `bjj_update_workout` RPC with section upsert logic (update existing by ID, insert new, delete removed)
3. Extend `BJJWorkoutFormPage` to detect edit mode (`id` param present) and pre-fill from existing workout + sections
4. Add route `/bjj/:id/edit` → `BJJWorkoutFormPage`
5. Add edit button to `BJJWorkoutDetail` visible to owner OR admin
6. Create `useUpdateBJJWorkout` hook that calls the new RPC

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/` | New | Two migrations: RLS admin policies, `bjj_update_workout` RPC |
| `src/features/bjj/hooks/useUpdateBJJWorkout.ts` | New | TanStack Query mutation for BJJ update |
| `src/features/bjj/pages/BJJWorkoutFormPage.tsx` | Modified | Edit mode detection, pre-fill state, submit handler branching |
| `src/app/router.tsx` | Modified | Add `/bjj/:id/edit` route |
| `src/features/workouts/pages/WorkoutDetailPage.tsx` | Modified | Edit button visibility (`isAdmin \|\| isOwner`) |
| `src/features/bjj/components/BJJWorkoutDetail.tsx` | Modified | Add edit button for owner/admin |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| RLS policy misconfiguration blocks legitimate edits | Medium | Test admin and athlete scenarios carefully; write Playwright tests for RLS |
| BJJ section upsert logic removes sections user still intends to keep | Medium | Ensure form always sends full section list; verify ID tracking in UI state |
| `bjj_section_input` composite type needs extension with optional `id` field | Low | Check existing type before creating migration; extend if needed |

## Rollback Plan

- Migration: revert RLS changes and drop RPC via `psql`
- Code: `git revert` the form page, router, and hook changes
- RLS: remove admin policies (keep athlete policies)

## Dependencies

- `useProfile` or `useAuth` for role detection (already exists — `AuthContext.tsx` exposes `role`)
- `useBJJWorkoutSections` for fetching sections in edit mode (already exists)
- Existing `useWorkouts` for fetching workout data in edit mode (already exists)

## Success Criteria

- [ ] Admin sees Edit button on any workout (CrossFit or BJJ)
- [ ] Athlete sees Edit button only on their own workouts
- [ ] CrossFit/Functional edit: pre-fill form, save updates row, cancel returns to detail
- [ ] BJJ edit: pre-fill workout + all sections, save upserts sections correctly
- [ ] BJJ edit: add section → created, remove section → deleted with cascade
- [ ] Admin can update any workout (RLS allows it)
- [ ] Athlete cannot update another athlete's workout (RLS blocks it)