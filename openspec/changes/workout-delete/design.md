# Design: Delete Workout

## Technical Approach

Add a Delete button with confirmation dialog to `BJJWorkoutDetail`, wired from `WorkoutDetailPage`. The existing `useDeleteWorkout` mutation and the Dialog component are reused directly — no new hook needed. A new Supabase migration adds the admin DELETE RLS policy that the proposal identified as a gap.

## Architecture Decisions

### Decision: Reuse existing Dialog pattern

**Choice**: Use the same `Dialog` component and `deleteOpen` / `handleDelete` pattern already present in `WorkoutDetailPage` for non-BJJ workouts.
**Alternatives considered**: Lift the Dialog into `BJJWorkoutDetail` or a shared component.
**Rationale**: `WorkoutDetailPage` already has all the pieces (state, mutation, navigate, toast). Extracting state management into the child would duplicate logic with no benefit. Keeping the Dialog at the page level avoids prop drilling of modal state.

### Decision: `canDelete` prop on `BJJWorkoutDetail` to gate the button

**Choice**: Add `canDelete?: boolean` prop rather than computing authorization inside the component.
**Alternatives considered**: Accept `user` and `workout` props and compute ownership/admin internally.
**Rationale**: `WorkoutDetailPage` already computes `canEdit` and `isOwner`/`isAdmin`. Prop drilling the computed boolean is simplest and mirrors the existing `canEdit` pattern.

## Data Flow

```
WorkoutDetailPage                        BJJWorkoutDetail
─────────────────                        ─────────────────
canDelete = isOwner || isAdmin   ──►    canDelete prop
                                      Delete button (if canDelete)
                                           │ onClick → setDeleteOpen(true)
                                      onDelete prop
                                           │ calls WorkoutDetailPage's handleDelete
handleDelete()
  → deleteMutation.mutateAsync(id)
  → navigate('/workouts')
```

The Dialog and `deleteOpen` state remain in `WorkoutDetailPage`, not lifted into the component.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/TIMESTAMP_workout_admin_delete_rls.sql` | Create | Admin DELETE policy on `workouts` |
| `src/features/bjj/components/BJJWorkoutDetail.tsx` | Modify | Add `canDelete`, `onDelete` props; render Delete button next to Edit |
| `src/features/workouts/pages/WorkoutDetailPage.tsx` | Modify | Pass `canDelete` and `onDelete` to `BJJWorkoutDetail` for BJJ workouts; move Dialog into BJJ render branch |

## Interface Changes

### `BJJWorkoutDetail` (modified)

```typescript
interface BJJWorkoutDetailProps {
  workoutId: string
  workout: Workout
  canEdit?: boolean
  canDelete?: boolean       // NEW
  onDelete?: () => void    // NEW
}
```

### Delete button (inside `BJJWorkoutDetail`)

```tsx
{canDelete && (
  <Button variant="destructive" onClick={onDelete}>
    Delete
  </Button>
)}
```

Rendered adjacent to the existing Edit button in the button row.

## Existing Patterns Used

| Pattern | Location | Reference |
|---------|----------|-----------|
| `useAuth()` → `user`, `role` | `WorkoutDetailPage.tsx:57` | Auth context |
| `isAdmin = role === 'admin'` | `WorkoutDetailPage.tsx:63` | Existing |
| `isOwner = workout.userId === user.id` | `WorkoutDetailPage.tsx:64` | Existing |
| Dialog confirmation | `WorkoutDetailPage.tsx:256-281` | Existing, will be reused |
| `useDeleteWorkout().mutateAsync` | `WorkoutDetailPage.tsx:157` | Already wired |
| RLS admin policy pattern | `20260519000001_workout_edit_rls.sql` | Migration pattern |

## Migration Detail

```sql
-- TIMESTAMP_workout_admin_delete_rls.sql
create policy "admin_delete_workouts"
  on public.workouts
  for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
```

Existing athlete DELETE policy (if any) remains; owner delete access is already granted by the default Supabase setup or a prior migration — verified by the fact that `useDeleteWorkout` works for owners today on non-BJJ workouts.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `canDelete` prop gates button rendering | Vitest component test |
| Unit | `onDelete` prop is called on button click | Vitest simulate click, verify mock called |
| Integration | Admin can delete any BJJ workout via UI | Playwright E2E as admin |
| Integration | Owner can delete own BJJ workout via UI | Playwright E2E as owner |
| Integration | Non-owner/non-admin cannot see delete button | Playwright E2E as viewer role |

## Open Questions

- None identified.

## Rollback

1. Revert migration: `drop policy "admin_delete_workouts" on public.workouts`
2. Revert `BJJWorkoutDetail` prop additions and Delete button
3. Revert `WorkoutDetailPage` prop passing and Dialog branch
No state is created or mutated until the user confirms the Dialog.