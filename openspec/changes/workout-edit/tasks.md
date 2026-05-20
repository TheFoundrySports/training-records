# Tasks: workout-edit

> **Domain**: `workout-edit`
> **Change**: `workout-edit`

---

## T1 — RLS Migration

**Files**:
- `supabase/migrations/20260519000001_workout_edit_rls.sql` (new)

**What**: Add admin UPDATE policies for `workouts`, `bjj_sections`, `bjj_section_techniques`

**Details**:

1. `workouts` table — add admin UPDATE policy alongside existing owner policy
2. `bjj_sections` table — add admin UPDATE policy (ownership via `workouts` join)
3. `bjj_section_techniques` table — add UPDATE policy for owner/admin (links to section → workout for ownership)

**Acceptance**: migrations apply cleanly; admin can UPDATE any workout row; athlete cannot UPDATE another's

**Estimated lines**: ~40

---

## T2 — bjj_update_workout RPC

**Files**:
- `supabase/migrations/20260519000002_bjj_update_workout_rpc.sql` (new)

**What**: SECURITY DEFINER function that updates workout fields and upserts sections/techniques

**Details**:
1. Check/create `bjj_section_input_v2` composite type with `id` (uuid, nullable), `name`, `goal`, `order_index`, `techniques` (text array)
2. Create `bjj_update_workout` function accepting `p_workout_id`, `p_title`, `p_performed_at`, `p_duration_min`, `p_notes`, `p_rpe`, `p_sections` (array of the composite type)
3. Auth check: fetch user role and workout owner; raise if not admin or owner
4. Update workout row with submitted fields
5. Upsert sections: IF `id` IS NOT NULL → UPDATE existing section; ELSE → INSERT new section
6. Replace techniques per section: DELETE existing `bjj_section_techniques` for section, then INSERT new ones by looking up technique IDs by name
7. Delete sections removed in form: remove any `bjj_sections` rows for this workout whose ID is not in the submitted payload

**Acceptance**: RPC updates workout; new section inserted; removed section deleted; technique list replaced

**Estimated lines**: ~80

---

## T3 — useUpdateBJJWorkout Hook

**Files**:
- `src/features/bjj/hooks/useUpdateBJJWorkout.ts` (new)
- `src/features/bjj/hooks/__tests__/useUpdateBJJWorkout.test.ts` (new)

**What**: TanStack Query mutation calling `bjj_update_workout` RPC with cache invalidation

**Details**:
1. Export `UpdateBJJWorkoutPayload` interface with `workoutId`, `title`, `performedAt`, `durationMin`, `notes`, `rpe`, `sections` (array of `{ id?, name, goal, orderIndex, techniques }`)
2. `useUpdateBJJWorkout()` returns `useMutation` with `mutationFn` calling `supabase.rpc('bjj_update_workout', ...)` — map camelCase payload to snake_case RPC args
3. `onSuccess` callback: invalidate `['workout', workoutId]` and `['bjj-sections', workoutId]`
4. Throw error on RPC failure

**Acceptance**: mutation calls RPC with correct args; cache invalidated on success; error surfaced on failure

**Estimated lines**: ~60

---

## T4 — BJJWorkoutFormPage Edit Mode

**Files**:
- `src/features/bjj/pages/BJJWorkoutFormPage.tsx` (modify)

**What**: Detect edit mode via `id` param; pre-fill form; submit calls update mutation

**Details**:
1. Extract `id` from `useParams()` — `isEditMode = !!id`
2. In edit mode, fetch workout via `useBJJWorkout(id!)` and sections via `useBJJWorkoutSections(id!)`
3. `useEffect` or `form.reset()` to pre-fill form fields (title, performedAt, durationMin, notes, rpe) and sections from fetched data
4. On submit: if `isEditMode`, call `updateBJJWorkout.mutateAsync(...)` then navigate to `/workouts/${id}`; else call `createBJJWorkout` and navigate to `/workouts`
5. Cancel: navigate to `/workouts/${id}` in edit mode, `/workouts` in create mode

**Acceptance**: form pre-filled in edit mode; save calls update mutation; create mode unaffected

**Estimated lines**: ~80

---

## T5 — Router

**Files**:
- `src/app/router.tsx` (modify)

**What**: Add edit route for BJJ workouts

**Details**:
1. Add route `{ path: '/bjj/:id/edit', element: <BJJWorkoutFormPage /> }`
2. Existing `/bjj/new` route remains unchanged (create mode with no `id` param)

**Acceptance**: `/bjj/:id/edit` renders BJJWorkoutFormPage in edit mode

**Estimated lines**: ~5

---

## T6 — Edit Button Visibility

**Files**:
- `src/features/workouts/pages/WorkoutDetailPage.tsx` (modify)
- `src/features/bjj/components/BJJWorkoutDetail.tsx` (modify)

**What**: Show Edit button to admins for all workouts, and to athletes only for their own

**Details**:
1. In `WorkoutDetailPage`: compute `canEdit = isAdmin || isOwner` using `useAuth().role` and workout owner check
2. For non-BJJ workouts: `{ canEdit && <Button onClick={() => navigate(`/workouts/${workout.id}/edit`)}>Edit</Button> }`
3. Pass `canEdit` prop to `BJJWorkoutDetail`
4. In `BJJWorkoutDetail`: accept optional `canEdit` prop; render Edit button when true: `<Button onClick={() => navigate(`/bjj/${workout.id}/edit`)}>Edit</Button>`

**Acceptance**: admin sees Edit on any workout; athlete sees Edit on own; athlete does not see Edit on other's

**Estimated lines**: ~20

---

## File Inventory

| File | Action |
|------|--------|
| `supabase/migrations/20260519000001_workout_edit_rls.sql` | Create |
| `supabase/migrations/20260519000002_bjj_update_workout_rpc.sql` | Create |
| `src/features/bjj/hooks/useUpdateBJJWorkout.ts` | Create |
| `src/features/bjj/hooks/__tests__/useUpdateBJJWorkout.test.ts` | Create |
| `src/features/bjj/pages/BJJWorkoutFormPage.tsx` | Modify |
| `src/features/bjj/components/BJJWorkoutDetail.tsx` | Modify |
| `src/features/workouts/pages/WorkoutDetailPage.tsx` | Modify |
| `src/app/router.tsx` | Modify |