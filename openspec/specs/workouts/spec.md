# Workouts — Spec

## Overview

The workouts feature is the core training log. It allows authenticated users to list, view, create, edit, and delete their own workout records. Each workout can optionally include a structured WOD (Workout of the Day) format drawn from a code-first registry, free-text WOD description, RPE, and notes. A "Load Workout" shortcut lets users pre-fill the form from the public WOD library.

## Requirements

### REQ-WKT-01: Workout List

The system MUST display all workouts belonging to the authenticated user, ordered by `performed_at` descending. A skeleton loading state MUST appear while data is fetching. An empty state MUST display when no workouts exist. A "Failed to load workouts" error message with `role="alert"` MUST appear on fetch failure.

#### Scenarios

- GIVEN the user navigates to `/workouts` / WHEN `useWorkouts` is fetching / THEN three animated skeleton cards with `aria-label="Loading workouts"` are visible
- GIVEN the user has no workouts / WHEN the fetch resolves with an empty array / THEN the text "No workouts yet" and a "Log workout" button are displayed
- GIVEN the user has three workouts / WHEN the fetch resolves / THEN three workout cards are listed in a `<ul aria-label="Workout list">` ordered newest first
- GIVEN a fetch error occurs / WHEN `isError` is `true` / THEN a `role="alert"` error container shows "Failed to load workouts"
- GIVEN a workout card is rendered / WHEN the user clicks it / THEN they navigate to `/workouts/:id`
- GIVEN the user clicks "Log workout" / WHEN the button is pressed / THEN they navigate to `/workouts/new`
- GIVEN each workout card / WHEN rendered / THEN it shows the workout title, formatted date, duration in minutes, and type badge

### REQ-WKT-02: Workout Detail

The system MUST display all fields of a single workout at `/workouts/:id`. Edit and Delete buttons MUST only appear if the authenticated user is the workout owner (`workout.userId === user.id`). A not-found state MUST appear when the workout does not exist or the user lacks permission.

#### Scenarios

- GIVEN the user navigates to `/workouts/:id` and the workout loads / WHEN the page renders / THEN title, date/time, duration, type badge, and optionally RPE/notes/WOD text/WOD format are displayed
- GIVEN the workout belongs to the authenticated user / WHEN the detail page renders / THEN "Edit" and "Delete" buttons are visible
- GIVEN the workout belongs to another user / WHEN the detail page renders / THEN "Edit" and "Delete" buttons are NOT visible
- GIVEN the API returns `PGRST116` or `NOT_FOUND` error code / WHEN the page renders / THEN "Workout not found" is displayed with `role="alert"`
- GIVEN the user clicks "← Back to workouts" / WHEN the button is clicked / THEN they navigate to `/workouts`
- GIVEN a workout has a structured WOD format and payload / WHEN the detail page renders / THEN the WOD format label and payload JSON are displayed in a `<pre>` block
- GIVEN the user is on the detail page while data is loading / WHEN `isLoading` is `true` / THEN skeleton elements with `aria-label="Loading workout"` are shown

### REQ-WKT-03: Workout Delete

The system MUST require confirmation before deleting a workout. After confirmation, the workout MUST be deleted and the user MUST be redirected to `/workouts`. Buttons MUST be disabled during the delete operation.

#### Scenarios

- GIVEN the user clicks "Delete" on the detail page / WHEN the button is pressed / THEN a confirmation dialog opens with title "Delete workout" and description warning the action cannot be undone
- GIVEN the confirmation dialog is open / WHEN the user clicks "Cancel" / THEN the dialog closes and the workout is NOT deleted
- GIVEN the confirmation dialog is open / WHEN the user confirms deletion / THEN `useDeleteWorkout` is called with the workout id and the user is navigated to `/workouts`
- GIVEN the delete operation is in flight / WHEN `deleteMutation.isPending` is `true` / THEN both the Cancel and Delete buttons in the dialog are disabled and the Delete button shows "Deleting…"
- GIVEN the delete succeeds / WHEN the mutation resolves / THEN the `['workouts']` query cache is invalidated

### REQ-WKT-04: Workout Create

The system MUST provide a form at `/workouts/new` with fields: title (required, max 200), type (crossfit|functional), performed_at (datetime-local, required), duration minutes (required, 1–300), notes (optional, max 2000), WOD text (optional, max 5000), WOD format (optional), and RPE (optional, 1–10). The form MUST validate with Zod before submission. After successful creation the user MUST be navigated to `/workouts`.

#### Scenarios

- GIVEN the user navigates to `/workouts/new` / WHEN the page renders / THEN the form title "Log Workout" and a "Load Workout" button are visible
- GIVEN the user submits with an empty title / WHEN Zod validation runs / THEN "Title is required" is shown as a field error
- GIVEN the user submits with duration 0 / WHEN Zod validation runs / THEN "Duration must be at least 1 minute" is displayed
- GIVEN the user submits with RPE 11 / WHEN Zod validation runs / THEN "RPE must be between 1 and 10" is displayed
- GIVEN the form is valid / WHEN submitted / THEN `useCreateWorkout` is called with the form values and the user is navigated to `/workouts`
- GIVEN the mutation is pending / WHEN the form is submitting / THEN the "Save" button is disabled and shows "Saving…"
- GIVEN a mutation error occurs / WHEN the mutation rejects / THEN an error alert is rendered with the error message
- GIVEN the user submits a `datetime-local` value `2026-04-05T10:00` / WHEN `normalizeDateTime` transforms it / THEN it becomes `2026-04-05T10:00:00.000Z` before being sent to Supabase

### REQ-WKT-05: Workout Edit

The system MUST provide a pre-populated form at `/workouts/:id/edit`. On load, the form MUST be filled with the existing workout data. After successful update the user MUST be navigated back to `/workouts/:id`. The "Load Workout" button MUST be hidden in edit mode.

#### Scenarios

- GIVEN the user navigates to `/workouts/:id/edit` / WHEN the existing workout loads / THEN all form fields are pre-populated with the workout's current values
- GIVEN the user is in edit mode / WHEN the page renders / THEN the form heading reads "Edit Workout" and "Load Workout" button is NOT present
- GIVEN the user changes the title and submits / WHEN the form is valid / THEN `useUpdateWorkout` is called with `{ id, data: values }` and the user is navigated to `/workouts/:id`
- GIVEN the edit is loading existing data / WHEN `loadingExisting` is `true` / THEN a loading skeleton with `aria-label="Loading workout"` is displayed
- GIVEN the user clicks "Cancel" in edit mode / WHEN the button is pressed / THEN they are navigated back to `/workouts/:id`

### REQ-WKT-06: WOD Format Registry

The system MUST support a code-first extensible registry of WOD formats. Each format self-registers via `registerFormat()`. Consumers use `getFormat(id)` to retrieve the handler. The registry MUST support: `amrap`, `for_time`, `emom`, `tabata`, `ladder`, `rft`.

#### Scenarios

- GIVEN all format modules are imported / WHEN `listFormats()` is called / THEN it returns at least 6 handlers with unique ids
- GIVEN `getFormat('amrap')` is called / WHEN the registry is initialized / THEN it returns a handler with `id='amrap'`, `label='AMRAP'`, `scoreType='rounds'`
- GIVEN a WOD format is selected in the form / WHEN the value changes / THEN the `payload` field is reset to `undefined` and the format-specific `FormSection` renders
- GIVEN `getFormat` is called with an unknown format id / WHEN the handler is not registered / THEN it throws an error (not silently returns `undefined`)
- GIVEN a format is selected and the user fills the payload / WHEN `handler.schema.safeParse(payload)` runs / THEN it validates with the format's own Zod schema
- GIVEN a new format file is added to `registry/formats/` and imported in `registry/formats/index.ts` / WHEN the form page loads / THEN the new format appears in the `WodFormatSelector` without any other code changes

### REQ-WKT-07: WOD Format Selector

The system MUST render a `<select>` with all registered formats plus a "None (free text only)" option. Selecting a format MUST update the form's `wodFormat` field and clear the payload. Selecting "None" MUST set `wodFormat` to `undefined`.

#### Scenarios

- GIVEN `WodFormatSelector` renders / WHEN formats are loaded from registry / THEN a `<select aria-label="WOD Format">` shows "None (free text only)" followed by each registered format label
- GIVEN the user selects "AMRAP" / WHEN `onChange` fires / THEN the parent form receives `wodFormat = 'amrap'` and `payload = undefined`
- GIVEN the user selects "None" after a format was chosen / WHEN `onChange` fires / THEN `wodFormat` is `undefined` and the format-specific `FormSection` disappears
- GIVEN `disabled={true}` is passed / WHEN the component renders / THEN the select is disabled

### REQ-WKT-08: Public WOD Picker (in workout form)

The system MUST provide a "Load Workout" button on the create form that opens a modal. The modal MUST list public WODs with optional search. Selecting a WOD MUST pre-fill title, type, WOD format, WOD text, payload, and duration into the form.

#### Scenarios

- GIVEN the user is on the create form / WHEN they click "Load Workout" / THEN the `PublicWodPickerModal` opens with a search input and a list of public WODs
- GIVEN the modal is open and the user types in the search box / WHEN 300ms elapses / THEN `usePublicWods` is called with `{ q: <search term> }`
- GIVEN the user selects a WOD from the list / WHEN the button is clicked / THEN the modal closes and the form fields (title, type, wodFormat, wodText, payload, durationMinutes) are reset with the WOD's values
- GIVEN no search term is entered / WHEN the modal renders / THEN `usePublicWods()` is called without a `q` param and all public WODs are shown
- GIVEN the public WOD fetch fails / WHEN `isError` is `true` / THEN "Failed to load workouts. Try again." is displayed inside the modal

### REQ-WKT-09: Data Integrity and Query Keys

The system MUST use TanStack Query with `queryKey: ['workouts']` for the list and `queryKey: ['workouts', id]` for individual records. All mutations MUST invalidate the `['workouts']` key on success. Update and delete MUST also invalidate the individual `['workouts', id]` key.

#### Scenarios

- GIVEN a workout is created / WHEN the mutation succeeds / THEN `['workouts']` is invalidated, triggering a list refetch
- GIVEN a workout is updated / WHEN the mutation succeeds / THEN both `['workouts']` and `['workouts', id]` are invalidated
- GIVEN a workout is deleted / WHEN the mutation succeeds / THEN `['workouts']` is invalidated
- GIVEN `useWorkout('')` is called / WHEN the query is enabled check runs / THEN the query does NOT execute (enabled: `false` for empty id)
- GIVEN `useCreateWorkout` is called with no active session / WHEN `supabase.auth.getUser()` returns no user / THEN the mutation throws `{ error: { code: 'UNAUTHORIZED', message: 'No active session' } }`

## Implementation Reference

| Concern                   | Location                                                    |
| ------------------------- | ----------------------------------------------------------- |
| Types                     | `src/features/workouts/workout.types.ts`                    |
| Form schema               | `src/features/workouts/workout.schema.ts`                   |
| List page                 | `src/features/workouts/pages/WorkoutListPage.tsx`           |
| Detail page               | `src/features/workouts/pages/WorkoutDetailPage.tsx`         |
| Form page (create & edit) | `src/features/workouts/pages/WorkoutFormPage.tsx`           |
| Page tests                | `src/features/workouts/pages/*.test.tsx`                    |
| Data hooks                | `src/features/workouts/hooks/useWorkouts.ts`                |
| Mutation hooks            | `src/features/workouts/hooks/useWorkoutMutations.ts`        |
| Row mapper                | `src/features/workouts/hooks/mapRow.ts`                     |
| WOD format registry       | `src/features/workouts/registry/`                           |
| Format handlers           | `src/features/workouts/registry/formats/`                   |
| WodFormatSelector         | `src/features/workouts/components/WodFormatSelector.tsx`    |
| PublicWodPickerModal      | `src/features/workouts/components/PublicWodPickerModal.tsx` |
| ExercisePicker            | `src/features/workouts/components/ExercisePicker.tsx`       |
| MovementFieldArray        | `src/features/workouts/components/MovementFieldArray.tsx`   |
| API                       | Supabase PostgREST via `@supabase/supabase-js`              |

## Configuration

No feature-specific env vars beyond the shared Supabase client. Uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

RLS: each user sees only their own `workouts` rows (user_id = auth.uid()).

## Design Decisions

- **Direct PostgREST (MVP):** All workout CRUD goes through the Supabase JS client directly. The `supabase/functions/workouts` Edge Function is reserved for a future `/api/v1/` migration.
- **Single form page for create/edit:** `WorkoutFormPage` detects mode via presence of `id` URL param. Edit mode loads existing data and resets the form via `useEffect`; create mode starts with defaults.
- **`normalizeDateTime` transform:** `datetime-local` inputs omit timezone info. The Zod schema's `.transform()` appends `.000Z` before the `datetime()` validator runs.
- **Format payload validated in `onSubmit`:** The format-specific Zod schema is run manually (`handler.schema.safeParse`) on the `payload` object inside `onSubmit`, not as part of the main `workoutSchema`. This keeps the main schema agnostic of any specific format.
- **WOD format registry is side-effect loaded:** All format modules call `registerFormat()` on import. The barrel `registry/formats/index.ts` is imported at the top of `WorkoutFormPage`, `WorkoutDetailPage`, and `WodFormatSelector` to ensure registration happens before any `getFormat()` call.

## Changelog

- **2026-04-12** — Initial spec written from implemented code (reverse-engineered)
