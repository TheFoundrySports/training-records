# Design: workout-edit

> **Domain**: `workout-edit`
> **Change**: `workout-edit`

---

## 1. RLS Migration

**File**: `supabase/migrations/20260519000001_workout_edit_rls.sql`

### 1.1 `workouts` table — add admin UPDATE policy

```sql
-- Existing: only allows owner to update
-- Add: admin can update any workout

CREATE POLICY "Admins can update any workout"
  ON workouts
  FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR auth.uid() = user_id
  );
```

### 1.2 `bjj_sections` table — add admin UPDATE policy

The existing policy checks ownership via the `workouts` table join:

```sql
CREATE POLICY "Admins can update any bjj_section"
  ON bjj_sections
  FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR auth.uid() = (SELECT user_id FROM workouts WHERE id = bjj_sections.workout_id)
  );
```

### 1.3 `bjj_section_techniques` table — add UPDATE + admin policies

**Add UPDATE policy for owner/admin** (the table currently has no UPDATE policy):

```sql
CREATE POLICY "Users can update techniques they own via section workout"
  ON bjj_section_techniques
  FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR auth.uid() = (
      SELECT w.user_id
      FROM bjj_sections s
      JOIN workouts w ON w.id = s.workout_id
      WHERE s.id = bjj_section_techniques.section_id
    )
  );
```

> Note: verify `bjj_section_techniques` structure — the junction links to `section_id`, which joins to `bjj_sections` which joins to `workouts` for ownership check.

---

## 2. `bjj_update_workout` RPC

**File**: `supabase/migrations/20260519000002_bjj_update_workout_rpc.sql`

### 2.1 Check existing `bjj_section_input` composite type

Before creating the RPC, check if `bjj_section_input` already exists and whether it has an `id` field:

```sql
SELECT typname, typcategory FROM pg_type WHERE typname = 'bjj_section_input';
```

If it exists but lacks `id`, create a new type `bjj_section_input_v2`:

```sql
CREATE TYPE bjj_section_input_v2 AS (
  id          uuid,           -- NULL = new section, non-NULL = existing section
  name        text,
  goal        text,
  order_index int,
  techniques  text[]          -- array of technique names
);
```

### 2.2 RPC function signature

```sql
CREATE OR REPLACE FUNCTION bjj_update_workout(
  p_workout_id    uuid,
  p_title         text,
  p_performed_at  timestamptz,
  p_duration_min  int,
  p_notes         text,
  p_rpe           int,
  p_sections      bjj_section_input_v2[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workout_owner uuid;
  v_user_role     text;
  v_section       bjj_section_input_v2;
  v_section_id    uuid;
  v_tech_name     text;
  v_tech_id       uuid;
BEGIN
  -- Auth check: get user role and workout owner
  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();
  SELECT user_id INTO v_workout_owner FROM workouts WHERE id = p_workout_id;

  IF v_workout_owner IS NULL THEN
    RAISE EXCEPTION 'Workout not found';
  END IF;

  IF v_user_role != 'admin' AND v_workout_owner != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to edit this workout';
  END IF;

  -- Update workout fields
  UPDATE workouts
  SET
    title            = p_title,
    performed_at     = p_performed_at,
    duration_minutes = p_duration_min,
    notes            = p_notes,
    rpe              = p_rpe
  WHERE id = p_workout_id;

  -- Process each section from the payload
  FOREACH v_section IN ARRAY p_sections LOOP
    IF v_section.id IS NOT NULL THEN
      -- Update existing section
      UPDATE bjj_sections
      SET name = v_section.name, goal = v_section.goal, order_index = v_section.order_index
      WHERE id = v_section.id AND workout_id = p_workout_id;

      v_section_id := v_section.id;
    ELSE
      -- Insert new section
      INSERT INTO bjj_sections (workout_id, name, goal, order_index)
      VALUES (p_workout_id, v_section.name, v_section.goal, v_section.order_index)
      RETURNING id INTO v_section_id;
    END IF;

    -- Replace techniques for this section:
    -- 1. Delete existing technique links
    DELETE FROM bjj_section_techniques WHERE section_id = v_section_id;

    -- 2. Insert new technique links (lookup by name)
    FOREACH v_tech_name IN ARRAY v_section.techniques LOOP
      SELECT id INTO v_tech_id FROM bjj_techniques WHERE name = v_tech_name LIMIT 1;
      IF v_tech_id IS NOT NULL THEN
        INSERT INTO bjj_section_techniques (section_id, technique_id)
        VALUES (v_section_id, v_tech_id);
      END IF;
    END FOREACH;
  END LOOP;

  -- Delete sections that were removed in the form
  DELETE FROM bjj_sections
  WHERE workout_id = p_workout_id
    AND id NOT IN (
      SELECT id FROM UNNEST(p_sections) AS s(id) WHERE id IS NOT NULL
    );
END;
$$;
```

### 2.3 Notes on the RPC

- `SECURITY DEFINER` so it runs with elevated privileges but still checks `auth.uid()` via the auth check block
- The `techniques` field accepts an array of **technique names** (strings), not IDs — the RPC resolves each name to an ID via lookup in `bjj_techniques`
- Unmatched technique names are silently skipped (no error; the section is still created/updated)
- The final `DELETE FROM bjj_sections` cascade deletes orphaned technique links via the FK

---

## 3. `useUpdateBJJWorkout` Hook

**File**: `src/features/bjj/hooks/useUpdateBJJWorkout.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { BJJWorkout, BJJSection } from '@/features/bjj/types';

interface BJJSectionInput {
  id?: string;
  name: string;
  goal: string;
  orderIndex: number;
  techniques: string[];
}

interface UpdateBJJWorkoutPayload {
  workoutId: string;
  title: string;
  performedAt: string;
  durationMin: number;
  notes: string;
  rpe: number;
  sections: BJJSectionInput[];
}

export function useUpdateBJJWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateBJJWorkoutPayload) => {
      const { error } = await supabase.rpc('bjj_update_workout', {
        p_workout_id:   payload.workoutId,
        p_title:        payload.title,
        p_performed_at: payload.performedAt,
        p_duration_min: payload.durationMin,
        p_notes:        payload.notes,
        p_rpe:          payload.rpe,
        p_sections:     payload.sections.map(s => ({
          id:          s.id ?? null,
          name:        s.name,
          goal:        s.goal,
          order_index: s.orderIndex,
          techniques:  s.techniques,
        })),
      });

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workout', variables.workoutId] });
      queryClient.invalidateQueries({ queryKey: ['bjj-sections', variables.workoutId] });
    },
  });
}
```

---

## 4. `BJJWorkoutFormPage` Edit Mode

**File**: `src/features/bjj/pages/BJJWorkoutFormPage.tsx` (modified)

### 4.1 Edit mode detection

```typescript
const { id } = useParams();          // from /bjj/:id/edit
const isEditMode = !!id;
```

### 4.2 Fetch existing workout + sections when in edit mode

```typescript
const { data: workout, isLoading } = useBJJWorkout(id!);      // existing hook
const { data: sections } = useBJJWorkoutSections(id!);         // existing hook
```

### 4.3 Pre-fill form state

When `isEditMode && workout && sections`:

```typescript
// Use useEffect or form.reset() to pre-fill:
// - title, performedAt, durationMin, notes, rpe from workout
// - sections from sections response
```

### 4.4 Submit handler branching

```typescript
const onSubmit = async (data: BJJWorkoutFormValues) => {
  if (isEditMode) {
    await updateBJJWorkout.mutateAsync({
      workoutId: id!,
      title:        data.title,
      performedAt:  data.performedAt,
      durationMin:  data.durationMin,
      notes:        data.notes,
      rpe:          data.rpe,
      sections:     data.sections.map((s, idx) => ({
        id:          s.id,           // undefined for new sections
        name:        s.name,
        goal:        s.goal ?? '',
        orderIndex:  idx,
        techniques:  s.techniques,
      })),
    });
    navigate(`/workouts/${id}`);
  } else {
    await createBJJWorkout.mutateAsync(data);
    navigate('/workouts');
  }
};
```

### 4.5 Cancel behavior

- Edit mode: navigate to `/workouts/${id}`
- Create mode: navigate to `/workouts`

---

## 5. Router Change

**File**: `src/app/router.tsx` (modified)

Add:

```typescript
{
  path: '/bjj/:id/edit',
  element: <BJJWorkoutFormPage />,
},
```

Keep existing `/bjj/new` route pointing to the same page (create mode — no `id` param).

---

## 6. WorkoutDetailPage — Edit Button Visibility

**File**: `src/features/workouts/pages/WorkoutDetailPage.tsx` (modified)

### 6.1 Compute `canEdit`

```typescript
const { user } = useAuth();
const isOwner = workout.userId === user?.id;
const canEdit = isAdmin || isOwner;
```

### 6.2 Edit button condition

```typescript
// For non-BJJ workouts (existing logic)
{!isBJJ && canEdit && (
  <Button onClick={() => navigate(`/workouts/${workout.id}/edit`)}>
    Edit
  </Button>
)}
```

### 6.3 BJJ edit button

For BJJ workouts, the existing code renders `<BJJWorkoutDetail />` which currently has no action buttons.

Modify `BJJWorkoutDetail` to accept `canEdit` prop and show an Edit button when true:

```typescript
interface BJJWorkoutDetailProps {
  workout: BJJWorkout;
  sections: BJJSection[];
  canEdit?: boolean;   // new prop
}

// Inside BJJWorkoutDetail:
// {canEdit && (
//   <Button onClick={() => navigate(`/bjj/${workout.id}/edit`)}>Edit</Button>
// )}
```

Then in `WorkoutDetailPage`:

```typescript
<BJJWorkoutDetail
  workout={workout as BJJWorkout}
  sections={bjjSections ?? []}
  canEdit={canEdit}
/>
```

---

## 7. Role Check

**File**: `src/features/auth/AuthContext.tsx`

Already exposes `role` from `user.user_metadata.role` at line 43:

```typescript
const { user } = useAuth();
const role = user?.user_metadata?.role as UserRole;
```

Use `useAuth().role` in the UI components. No new hook needed.

For the RPC auth check in Postgres, use:

```sql
SELECT role FROM profiles WHERE id = auth.uid();
```

(Profiles table is assumed to have a `role` column — verify this against the existing schema.)

---

## 8. Test Strategy (Strict TDD)

### 8.1 Unit Tests

**`useUpdateBJJWorkout` hook**

```typescript
// src/features/bjj/hooks/__tests__/useUpdateBJJWorkout.test.ts
it('calls bjj_update_workout RPC with correct payload', async () => {
  const { supabase } = useMockSupabase();
  supabase.rpc.mockResolvedValueOnce({ error: null });

  const { result } = renderHook(() => useUpdateBJJWorkout());

  await result.current.mutateAsync({
    workoutId: 'w-123',
    title: 'Edited BJJ',
    performedAt: '2026-05-01T10:00:00Z',
    durationMin: 60,
    notes: 'Updated notes',
    rpe: 8,
    sections: [{ name: 'Drills', goal: 'Practice', orderIndex: 0, techniques: ['Arm Bar'] }],
  });

  expect(supabase.rpc).toHaveBeenCalledWith('bjj_update_workout', expect.objectContaining({
    p_workout_id: 'w-123',
    p_title: 'Edited BJJ',
  }));
});

it('invalidates workout and bjj-sections queries on success', async () => {
  // ...
});
```

### 8.2 RLS Integration Tests (Playwright)

Use a test helper that sets `auth.uid()` and `auth.role()` via Supabase's `auth.get_session()` mocking or a test helper function.

**Admin can update any workout**:
```typescript
it('admin can update another users CrossFit workout', async () => {
  await loginAs('admin@test.com');
  await page.goto('/workouts/athlete-workout-id/edit');
  await page.fill('[name="title"]', 'Admin Updated');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/workouts/athlete-workout-id');
});
```

**Athlete blocked on others workout**:
```typescript
it('athlete cannot see edit button on another athletes workout', async () => {
  await loginAs('athlete@test.com');
  await page.goto('/workouts/other-athletes-workout-id');
  await expect(page.locator('button:has-text("Edit")')).not.toBeVisible();
});
```

### 8.3 BJJWorkoutFormPage Edit Mode Integration

```typescript
it('renders pre-filled form in edit mode', async () => {
  await loginAs('athlete@test.com');
  await page.goto('/bjj/bjj-workout-id/edit');
  await expect(page.locator('input[name="title"]')).toHaveValue('Morning Drill');
  await expect(page.locator('[data-section-count]')).toHaveText('2');
});
```

---

## 9. File Inventory

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