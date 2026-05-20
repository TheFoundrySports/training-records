---
name: workout-edit
description: Allow admins to edit all workouts and athletes to edit only their own workouts. CrossFit/Functional needs RLS admin policy + edit button fix. BJJ needs new update RPC, edit mode on form, new route, and admin RLS policies.
change: workout-edit
status: draft
---

# Delta for Workout Edit

> **Domain**: `workout-edit`
> **Change**: `workout-edit`

---

## MODIFIED Requirements

### REQ-ED1: Edit Button Visibility

The system MUST show the Edit button to admins for ALL workouts, and to athletes only for workouts they own.

#### Scenario: Admin sees Edit button on any workout

- GIVEN a user with role `admin` is viewing a workout detail page
- WHEN the page renders
- THEN the Edit button MUST be visible
- AND it MUST be accessible regardless of which user owns the workout

#### Scenario: Athlete sees Edit button on own workout

- GIVEN a user with role `athlete` who owns a specific workout is viewing that workout's detail page
- WHEN the page renders
- THEN the Edit button MUST be visible

#### Scenario: Athlete does NOT see Edit button on other's workout

- GIVEN a user with role `athlete` is viewing a workout owned by a different athlete
- WHEN the page renders
- THEN the Edit button MUST NOT be visible

---

### REQ-ED2: CrossFit/Functional Workout Edit

The system MUST allow editing of CrossFit and Functional workouts via `/workouts/:id/edit`.

The edit route MUST pre-fill all workout fields from the existing database row.

On save: the `workouts` row MUST be updated via `useUpdateWorkout`.

On cancel: return to the workout detail page without saving.

#### Scenario: Admin edits another user's CrossFit workout

- GIVEN an admin is on `/workouts/:id/edit` for a CrossFit workout owned by athlete A
- WHEN the admin changes the title to "Updated AMRAP"
- AND clicks Save
- THEN the `workouts` row MUST be updated with the new title
- AND the user is redirected to `/workouts/:id`

#### Scenario: Athlete saves updated RPE on their own workout

- GIVEN an athlete is on `/workouts/:id/edit` for their own CrossFit workout
- WHEN the athlete changes `rpe` from 7 to 8
- AND clicks Save
- THEN the `workouts` row MUST be updated with `rpe = 8`

#### Scenario: Athlete cancels edit

- GIVEN an athlete is on `/workouts/:id/edit` with unsaved changes
- WHEN the athlete clicks Cancel
- THEN no database changes are made
- AND the user is redirected to `/workouts/:id`

---

### REQ-ED3: BJJ Workout Edit

The system MUST allow editing of BJJ workouts via `/bjj/:id/edit`.

The edit route MUST pre-fill the workout fields AND all BJJ sections with their techniques from the database.

On save: the `bjj_update_workout` RPC MUST be called with the full workout and sections payload.

Section upsert semantics:
- A section WITH an `id` field → UPDATE the existing `bjj_sections` row by that ID
- A section WITHOUT an `id` field → INSERT a new `bjj_sections` row
- A section ID present in the database but NOT in the submitted payload → DELETE that `bjj_sections` row (cascade deletes `bjj_section_techniques`)

Techniques per section: the entire `bjj_section_techniques` set for a section MUST be replaced on save (delete all existing links for that section, then insert the submitted technique list).

#### Scenario: Edit workout title

- GIVEN a user is on `/bjj/:id/edit` for a BJJ workout with title "Morning Drill"
- WHEN the user changes the title to "Evening Drill"
- AND saves
- THEN the `workouts` row MUST have `title = 'Evening Drill'`

#### Scenario: Add a new section

- GIVEN a user is editing a BJJ workout that has 2 sections
- WHEN the user adds a 3rd section with name "Sparring" and some techniques
- AND saves
- THEN a new `bjj_sections` row MUST be created for that workout
- AND it MUST contain the submitted techniques via `bjj_section_techniques`

#### Scenario: Remove a section

- GIVEN a user is editing a BJJ workout with sections A, B, C (where C has ID `section-c-id`)
- WHEN the user removes section C from the form
- AND saves
- THEN the `bjj_sections` row with `id = section-c-id` MUST be deleted
- AND all `bjj_section_techniques` rows linked to `section-c-id` MUST be cascade deleted

#### Scenario: Edit section goal

- GIVEN a user is editing a BJJ workout with a section whose `id = section-2` and `goal = 'Pass guard'`
- WHEN the user changes that section's goal to "Sweep"
- AND saves
- THEN the `bjj_sections` row with `id = section-2` MUST have `goal = 'Sweep'`

#### Scenario: Change techniques in a section

- GIVEN a user is editing a section that currently has techniques ["Arm Bar", "Kimura"]
- WHEN the user replaces those with ["Triangle Choke", "Omoplata"]
- AND saves
- THEN all existing `bjj_section_techniques` rows for that section MUST be deleted
- AND new `bjj_section_techniques` rows for "Triangle Choke" and "Omoplata" MUST be inserted

---

### REQ-ED4: RLS Policies for Workout Edit

The system MUST enforce row-level security that allows admin role to UPDATE any row, while athletes can only UPDATE rows they own via the workout ownership chain.

#### Scenario: Admin updates any workout → succeeds

- GIVEN an admin is authenticated
- WHEN the admin calls `UPDATE workouts WHERE id = :id` for any workout row
- THEN the operation MUST succeed
- AND the row MUST be updated

#### Scenario: Admin updates any BJJ section → succeeds

- GIVEN an admin is authenticated
- WHEN the admin calls `UPDATE bjj_sections WHERE workout_id = :workout_id` for any workout
- THEN the operation MUST succeed

#### Scenario: Admin updates any BJJ section technique → succeeds

- GIVEN an admin is authenticated
- WHEN the admin calls `UPDATE bjj_section_techniques` for any technique row
- THEN the operation MUST succeed

#### Scenario: Athlete updates own workout → succeeds

- GIVEN an athlete A is authenticated
- AND athlete A owns workout W
- WHEN athlete A calls `UPDATE workouts WHERE id = :id AND user_id = auth.uid()` for workout W
- THEN the operation MUST succeed

#### Scenario: Athlete updates other's workout → fails

- GIVEN athlete A is authenticated
- AND athlete B owns workout W
- WHEN athlete A calls `UPDATE workouts WHERE id = :id` for workout W
- THEN the operation MUST fail with an RLS error
- AND no row is modified

---

## Data Model

No new tables.

**Modified tables**:

| Table | Change | Description |
|-------|--------|-------------|
| `workouts` | RLS policy | Add admin UPDATE policy |
| `bjj_sections` | RLS policy | Add admin UPDATE policy |
| `bjj_section_techniques` | RLS policy | Add admin UPDATE policy |

**New RPC**:

| RPC | Input | Description |
|-----|-------|-------------|
| `bjj_update_workout` | workout fields + sections array | Upserts workout + all BJJ sections and techniques |

---

## Capabilities

### workout-edit-crossfit
Edit CrossFit/Functional workouts. Pre-fill form, save updates row, cancel returns to detail without saving. Requires admin role or ownership.

### workout-edit-bjj
Edit BJJ workouts. Pre-fill workout + sections, save calls `bjj_update_workout` RPC with full upsert semantics. Requires admin role or ownership.