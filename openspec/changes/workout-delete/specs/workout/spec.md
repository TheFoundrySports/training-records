# Delta for workout-delete

## ADDED Requirements

### Requirement: Delete Workout Authorization

The system MUST allow a user with the **owner** role to delete their own workout, and a user with the **admin** role to delete any workout. Users with neither role MUST NOT be able to initiate or perform a workout delete.

The system SHALL expose delete authorization via a `canDelete` boolean prop on `BJJWorkoutDetail`.

#### Scenario: Owner deletes own workout

- GIVEN the current user is the workout owner
- WHEN the user clicks the Delete button on the workout detail
- THEN a confirmation dialog MUST appear

#### Scenario: Admin deletes any workout

- GIVEN the current user is an admin
- WHEN the user clicks the Delete button on any workout detail
- THEN a confirmation dialog MUST appear

#### Scenario: Non-privileged user cannot delete

- GIVEN the current user is neither the workout owner nor an admin
- WHEN the user views the workout detail
- THEN the Delete button MUST NOT be rendered

### Requirement: Delete Confirmation

The system MUST display a confirmation dialog before executing any workout delete action. The dialog MUST require explicit user confirmation to proceed.

The system MUST call the `onDelete` callback prop on `BJJWorkoutDetail` when the user confirms the delete action.

#### Scenario: User confirms delete

- GIVEN the confirmation dialog is displayed
- WHEN the user confirms the delete
- THEN the system MUST invoke the delete operation via `useDeleteWorkout`

#### Scenario: User cancels delete

- GIVEN the confirmation dialog is displayed
- WHEN the user cancels the delete
- THEN the dialog MUST be dismissed with no delete action taken

### Requirement: Delete Navigation

The system MUST navigate to the workout list page upon successful deletion of a workout.

#### Scenario: Delete succeeds

- GIVEN the delete operation completes successfully
- THEN the system MUST navigate to `/bjj` (workout list)

### Requirement: Delete Error Handling

The system MUST display a toast notification upon failure of the delete operation.

#### Scenario: Delete fails

- GIVEN the delete operation fails
- THEN the system MUST show an error toast and remain on the current page

### Requirement: Cascade Delete

The system MUST cascade delete related BJJ data via the existing foreign key constraints when a workout is deleted.

#### Scenario: Cascade occurs

- GIVEN a workout is deleted
- THEN all related rows in tables with ON DELETE CASCADE foreign keys referencing `workouts.id` MUST be removed

### Requirement: RLS Delete Policy

The system MUST enforce row-level security such that admin users can delete any workout and owners can delete their own workouts.

The system MUST include a Supabase RLS migration adding an admin DELETE policy on the `workouts` table.

#### Scenario: Admin RLS grants delete

- GIVEN an admin is authenticated with Supabase
- WHEN the admin submits a delete for a non-owned workout
- THEN the RLS policy MUST allow the operation

#### Scenario: Owner RLS grants delete

- GIVEN a workout owner is authenticated with Supabase
- WHEN the owner submits a delete for their own workout
- THEN the RLS policy MUST allow the operation

#### Scenario: RLS denies delete for non-owner/non-admin

- GIVEN a user is neither the workout owner nor an admin
- WHEN the user submits a delete for a workout
- THEN the RLS policy MUST deny the operation