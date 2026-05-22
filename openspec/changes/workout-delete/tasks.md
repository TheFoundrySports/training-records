# Tasks: Delete Workout

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~50 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
400-line budget risk: Low

### Work Units

Not applicable — single PR within budget.

## Phase 1: Database Migration

- [ ] 1.1 Create `supabase/migrations/TIMESTAMP_workout_admin_delete_rls.sql` with `create policy "admin_delete_workouts" on public.workouts for delete using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))`

## Phase 2: BJJWorkoutDetail Component

- [ ] 2.1 Add `canDelete?: boolean` and `onDelete?: () => void` to `BJJWorkoutDetailProps` interface in `src/features/bjj/components/BJJWorkoutDetail.tsx`
- [ ] 2.2 Destructure `canDelete` and `onDelete` in `BJJWorkoutDetail` function params
- [ ] 2.3 Add Delete button (variant="destructive") adjacent to Edit button in the `canEdit` button row, gated by `canDelete && onDelete`
- [ ] 2.4 RED: Add unit test — `BJJWorkoutDetail` renders Delete button only when `canDelete && onDelete` provided; clicking Delete button calls `onDelete`

## Phase 3: WorkoutDetailPage Wiring

- [ ] 3.1 In the BJJ render branch, pass `canDelete={canEdit}` and `onDelete={() => setDeleteOpen(true)}` to `BJJWorkoutDetail`
- [ ] 3.2 Move the `Dialog` confirmation block (lines 256–281 from non-BJJ branch) into the BJJ render branch after `BJJWorkoutDetail`
- [ ] 3.3 GREEN: Existing `WorkoutDetailPage` tests already cover owner/admin delete flow — verify no regressions with `npm test`

## Phase 4: Verification

- [ ] 4.1 Run `npm run build` to confirm no type errors
- [ ] 4.2 Run `npm run test:e2e` smoke test (or at minimum verify delete flow passes in existing Playwright tests)

## Phase 5: Cleanup

- [ ] 5.1 Remove any commented-out or dead code from the non-BJJ branch if Dialog was moved
- [ ] 5.2 Ensure no TODO/FIXME comments remain in changed files