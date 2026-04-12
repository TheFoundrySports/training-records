# Exercises — Spec

## Overview

The exercises feature manages a shared catalog of fitness movements used throughout the app (e.g., as movement references in WOD format payloads). Authenticated users can browse and search the catalog. Admin users can create and edit exercises through the UI. All read/write operations are routed through the `exercises` Edge Function, which enforces admin-only writes server-side. The catalog is paginated (20 per page) and supports filtering by name, category, and movement type.

## Requirements

### REQ-EXC-01: Exercise List

The system MUST display a paginated table of exercises at `/exercises` showing name, movement type, difficulty level, and an edit link per row. A loading skeleton MUST appear while data is fetching. An empty state MUST appear when no exercises exist.

#### Scenarios

- GIVEN the user navigates to `/exercises` / WHEN `useExercises` is fetching / THEN skeleton rows with `aria-label="Loading exercises"` are visible
- GIVEN exercises exist / WHEN the fetch resolves / THEN a table renders with columns: Name, Movement Type, Difficulty, Actions
- GIVEN exercises exist / WHEN the table renders / THEN each row shows the exercise name, movement type, difficulty level, and an "Edit" link to `/exercises/:id/edit`
- GIVEN no exercises exist / WHEN the fetch resolves with an empty array / THEN the text "No exercises yet. Add one above." is displayed
- GIVEN the user clicks "Add Exercise" / WHEN the button is pressed / THEN they navigate to `/exercises/new`

### REQ-EXC-02: Exercise Filtering

The system MUST support filtering exercises by name (text search `q`), category (`category_id`), movement type (`movement_type`), and page number. Filters MUST be passed as query string parameters to the `exercises` Edge Function.

#### Scenarios

- GIVEN a filter `{ q: 'pull' }` is passed to `useExercises` / WHEN the Edge Function handles the request / THEN it applies `ilike('name', '%pull%')` to the Supabase query
- GIVEN a filter `{ categoryId: 'abc-123' }` is passed / WHEN the Edge Function handles the request / THEN it filters by `category_id = 'abc-123'`
- GIVEN a filter `{ movementType: 'Gymnastics' }` is passed / WHEN the Edge Function handles the request / THEN it filters by `movement_type = 'Gymnastics'`
- GIVEN a filter `{ page: 2 }` is passed / WHEN the Edge Function handles the request / THEN results are offset by 20 (pageSize × (page − 1))
- GIVEN no filters are provided / WHEN `buildQuery` runs / THEN no query string is appended and the URL is `/exercises`

### REQ-EXC-03: Exercise Create (Admin Only)

The system MUST provide a form at `/exercises/new` with fields: name (required, max 200), movement type (Gymnastics | Weightlifting | Monostructural | Mixed), measurement type (Reps | Weight | Distance | Time | Reps/Weight), difficulty level (Beginner | Intermediate | Advanced | Elite), description (optional, max 2000). On success the user MUST be redirected to `/exercises`. Only admin users SHOULD be able to successfully create exercises; the server MUST return `403` for non-admin users.

#### Scenarios

- GIVEN an admin user navigates to `/exercises/new` / WHEN the page renders / THEN the form heading "Add Exercise" and default values (Gymnastics, Reps, Beginner) are displayed
- GIVEN the user submits with an empty name / WHEN Zod validates / THEN "Name is required" field error is shown
- GIVEN the user submits a valid form as admin / WHEN `useCreateExercise` resolves / THEN the user is navigated to `/exercises` and the `['exercises']` cache is invalidated
- GIVEN an athlete-role user submits the form / WHEN the Edge Function checks `isAdmin` / THEN it returns `403 FORBIDDEN` and an error alert is shown
- GIVEN the mutation is pending / WHEN the form submits / THEN the "Save" button is disabled and shows "Saving…"
- GIVEN an exercise with the same name already exists / WHEN the Edge Function detects a unique constraint violation (code `23505`) / THEN it returns `409 DUPLICATE_NAME` with a descriptive message

### REQ-EXC-04: Exercise Edit (Admin Only)

The system MUST provide a pre-populated form at `/exercises/:id/edit`. On load the form MUST be filled with the existing exercise data. After successful update the user MUST be redirected to `/exercises`. Only admin users SHOULD be able to successfully update exercises.

#### Scenarios

- GIVEN the user navigates to `/exercises/:id/edit` / WHEN the existing exercise loads / THEN all form fields are pre-populated with the exercise's current values
- GIVEN the user changes the difficulty level and submits / WHEN the form is valid / THEN `useUpdateExercise` is called with `{ id, data: values }` and the user is navigated to `/exercises`
- GIVEN the exercise is loading / WHEN `loadingExisting` is `true` / THEN a loading skeleton with `aria-label="Loading exercise"` is displayed
- GIVEN the user clicks "Cancel" / WHEN the button is pressed / THEN they navigate to `/exercises`
- GIVEN a non-admin user submits an edit / WHEN the Edge Function checks `isAdmin` / THEN it returns `403` and an error alert is shown

### REQ-EXC-05: Exercise API (Edge Function)

The `exercises` Edge Function MUST serve REST CRUD at `/exercises` and `/exercises/:id`. It MUST also expose `/exercises/categories` and `/exercises/equipment`. All endpoints MUST require a valid JWT. Write operations MUST require the `admin` role. Page size MUST be 20.

#### Scenarios

- GIVEN `GET /exercises` is called without filters / WHEN the function handles it / THEN it returns `{ data: [], total: 0, page: 1, pageSize: 20 }`
- GIVEN `POST /exercises` is called with valid body by an admin / WHEN the insert succeeds / THEN it returns `201` with the created exercise row
- GIVEN `PUT /exercises/:id` is called by an admin / WHEN the update succeeds / THEN it returns `200` with the updated row and `updated_at` set to now
- GIVEN `DELETE /exercises/:id` is called by an admin / WHEN the delete succeeds / THEN it returns `204 No Content`
- GIVEN `GET /exercises/:id` is called with a non-existent id / WHEN the DB returns `PGRST116` / THEN the function returns `404 NOT_FOUND`
- GIVEN `GET /exercises/categories` is called / WHEN the function processes it / THEN it returns the full list of categories ordered by name
- GIVEN `GET /exercises/equipment` is called / WHEN the function processes it / THEN it returns the full list of equipment ordered by name
- GIVEN an unsupported HTTP method (e.g., `PATCH`) is sent / WHEN the function evaluates the method / THEN it returns `405 METHOD_NOT_ALLOWED`

### REQ-EXC-06: Exercise Picker (in WOD forms)

The system MUST provide an `ExercisePicker` component (used inside `MovementFieldArray`) that renders a text input with a `<datalist>`. It MUST debounce user input to search exercises. When a matching exercise name is selected, it MUST call `onChange(id, name)`.

#### Scenarios

- GIVEN `ExercisePicker` renders / WHEN exercises are loading / THEN the placeholder text is "Loading exercises…"
- GIVEN the user types "pull" / WHEN the query fires / THEN `useExercises({ q: 'pull' })` is called
- GIVEN the user types a name that exactly matches an exercise / WHEN the match is found / THEN `onChange(id, name)` is called with the matching exercise's id
- GIVEN a UUID value is passed as `value` but the exercise is not in the current list / WHEN `useExercise(id)` resolves / THEN the input displays the resolved exercise name
- GIVEN the exercises fetch fails / WHEN `error` is truthy / THEN "Failed to load exercises" is displayed below the input

## Implementation Reference

| Concern                   | Location                                                |
| ------------------------- | ------------------------------------------------------- |
| Types                     | `src/features/exercises/exercise.types.ts`              |
| Form schema               | `src/features/exercises/exercise.schema.ts`             |
| List page                 | `src/features/exercises/pages/ExerciseListPage.tsx`     |
| Form page (create & edit) | `src/features/exercises/pages/ExerciseFormPage.tsx`     |
| Data hooks                | `src/features/exercises/hooks/useExercises.ts`          |
| Mutation hooks            | `src/features/exercises/hooks/useExerciseMutations.ts`  |
| Row mapper                | `src/features/exercises/hooks/mapExerciseRow.ts`        |
| Hook tests                | `src/features/exercises/hooks/useExercises.test.tsx`    |
| ExercisePicker component  | `src/features/workouts/components/ExercisePicker.tsx`   |
| API                       | `supabase/functions/exercises/index.ts` (Edge Function) |

## Configuration

| Variable                    | Source           | Purpose                                                |
| --------------------------- | ---------------- | ------------------------------------------------------ |
| `SUPABASE_URL`              | Supabase secrets | Used by Edge Function                                  |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secrets | Used by Edge Function to verify JWT and check profiles |

RLS: `exercises`, `categories`, `equipment` tables — read = authenticated, write = admin (enforced in Edge Function; DB-level RLS also restricts direct writes).

## Design Decisions

- **Edge Function for all exercise CRUD:** Instead of direct PostgREST access, exercise reads and writes go through `supabase/functions/exercises`. This is the only path that can read `profiles.role` server-side to enforce admin-only writes without exposing service-role keys to the client.
- **`api.ts` fetch wrapper:** All exercise calls use `apiGet/apiPost/apiPut/apiDelete` from `src/lib/api.ts` which includes `Authorization: Bearer` headers and a 401 retry on token expiry.
- **`toSnakeCase` mapping in mutations:** `useExerciseMutations` transforms camelCase form values to `snake_case` before POSTing to the Edge Function, matching the Postgres column names.
- **Paginated list, page size 20:** The Edge Function uses `.range(from, to)` with `count: 'exact'` to return total count alongside the page of results.
- **`useExercise` fallback in ExercisePicker:** When a UUID value is set (e.g., from a loaded workout) but not present in the current page of results, the picker individually fetches the exercise by id to resolve the display name. This avoids requiring the full list to be loaded.

## Changelog

- **2026-04-12** — Initial spec written from implemented code (reverse-engineered)
