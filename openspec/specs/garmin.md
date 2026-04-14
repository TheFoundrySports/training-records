# Garmin Import + Training Intelligence — Spec

> **Domain**: `garmin`
> **Status**: Active
> **Introduced by**: `garmin-import-training-intelligence` (2026-04-12)

---

## Purpose

Defines requirements and acceptance scenarios for `.fit` file import, parsed metrics display, AI-powered training evaluation, and adaptation warnings.

---

## Requirements

### REQ-1: FIT File Upload

The system MUST provide a modal dialog on `WorkoutDetailPage` that allows the athlete to select and upload a `.fit` file.
The modal MUST link the import to the current workout (existing `workout_id`).
The system MUST NOT auto-create a new workout from FIT metadata.
The system MUST reject files larger than 10 MB with a user-visible error.
The system MUST reject files that are not valid FIT format with a user-visible error.
The system MUST store the raw FIT file in Supabase Storage bucket `garmin-fits` (private, RLS to owner).
Storage file path MUST follow the format `{user_id}/{workout_id}/{timestamp}.fit`.

#### Scenario: Successful FIT upload

- GIVEN the athlete is on `WorkoutDetailPage` for a workout without a Garmin import
- WHEN the athlete opens the upload modal and selects a valid `.fit` file ≤ 10 MB
- THEN the system uploads the file, parses metrics, and stores them linked to the workout
- AND the modal closes and the `TrainingMetricsPanel` becomes visible

#### Scenario: File too large

- GIVEN the athlete selects a `.fit` file larger than 10 MB
- WHEN the athlete confirms the upload
- THEN the system MUST reject the upload before sending to the Edge Function
- AND display an error message indicating the file size limit

#### Scenario: Invalid or corrupt FIT file

- GIVEN the athlete selects a file that is not a valid FIT binary
- WHEN the Edge Function attempts to parse it
- THEN the system MUST return an error response
- AND the modal MUST display a user-visible parse error; no partial data is saved

---

### REQ-2: FIT Metrics Extraction and Storage

The `garmin-import` Edge Function MUST extract the following fields from the FIT file:

| Field                                     | Type    | Notes                                                                  |
| ----------------------------------------- | ------- | ---------------------------------------------------------------------- |
| `elapsed_time_seconds`                    | integer | Total elapsed time                                                     |
| `avg_heart_rate_bpm`                      | integer | Session average HR                                                     |
| `max_heart_rate_bpm`                      | integer | Session max HR                                                         |
| `hr_zone_1_seconds` – `hr_zone_5_seconds` | integer | Seconds per HR zone; fallback: compute from raw HR if zone data absent |
| `training_load`                           | float   | Garmin Training Effect or TRIMP equivalent                             |
| `recovery_time_hours`                     | integer | Garmin recommended recovery window                                     |
| `vo2max_estimate`                         | float   | Optional — MAY be null if device does not report it                    |
| `calories`                                | integer | Active calories                                                        |

The function MUST insert one row into `garmin_activities` and MUST return `garmin_activity_id`.
The function MUST update `workouts.garmin_activity_id` with the new ID.

#### Scenario: HR zone data absent from device

- GIVEN the athlete uploads a `.fit` file from a device that does not report zone seconds
- WHEN the Edge Function parses the file
- THEN `hr_zone_*_seconds` MUST be computed from raw HR samples using standard zone thresholds
- AND the stored row MUST include computed zone values (not null)

---

### REQ-3: Metrics Display

The system MUST render a `TrainingMetricsPanel` on `WorkoutDetailPage` when `garminActivityId` is present on the workout.
The panel MUST display: elapsed time, avg HR, max HR, HR zone distribution (bar), training load, recovery time, calories, and VO₂max (if available).
The panel MUST NOT be rendered when no Garmin import is linked.

#### Scenario: Metrics panel visible after import

- GIVEN a workout with a linked `garmin_activity_id`
- WHEN the athlete navigates to `WorkoutDetailPage`
- THEN `TrainingMetricsPanel` is rendered with all extracted metrics
- AND HR zones are shown as a proportional stacked bar

---

### REQ-4: AI Training Evaluation

The `training-evaluation` Edge Function MUST be called after `garmin-import` returns successfully.
The function MUST call GPT-4o-mini with parsed metrics and return a structured evaluation.
The response MUST be validated with Zod before storage; invalid responses MUST NOT be saved.
The function MUST store one row in `training_evaluations` linked to `garmin_activity_id`.

The evaluation response MUST include:

| Field                     | Type           | Values                                                 |
| ------------------------- | -------------- | ------------------------------------------------------ |
| `summary`                 | string         | Narrative of the session                               |
| `readiness_level`         | enum           | `excellent` \| `good` \| `moderate` \| `low` \| `rest` |
| `next_session_suggestion` | string         | Actionable recommendation                              |
| `adaptation_warning`      | string \| null | Present only when warning fires                        |

> **Note**: `readiness_level` uses a 5-value enum (`excellent | good | moderate | low | rest`). Original proposal draft mentioned `low | medium | high` — the richer 5-value model was an intentional implementation improvement, approved at verify (2026-04-12).

> **Note**: Field is named `next_session_suggestion` throughout the implementation. An earlier draft of the spec used `next_training_suggestion` — `next_session_suggestion` is the canonical name.

#### Scenario: Successful AI evaluation

- GIVEN a workout with a linked Garmin import
- WHEN `training-evaluation` is called with `garmin_activity_id`
- THEN the `AIEvaluationCard` on `WorkoutDetailPage` renders summary, readiness level, and next suggestion
- AND the card appears within approximately 5 seconds of the FIT upload completing

#### Scenario: LLM timeout or invalid JSON response

- GIVEN the LLM returns malformed JSON or an invalid `readiness_level` value
- WHEN Zod validation runs
- THEN the function MUST return an error; no partial row is inserted in `training_evaluations`
- AND `AIEvaluationCard` MUST display an error state (not a blank card)

---

### REQ-5: Adaptation Warning

The system MUST query the athlete's next planned workout after the import timestamp.
The system MUST fire an adaptation warning when the next planned workout starts within `recovery_time_hours` of the import.
The warning MUST be included in the `training_evaluations.adaptation_warning` field and displayed in `AIEvaluationCard`.
If no next planned workout exists, the system MUST NOT show a warning.
If the next planned workout is beyond the `recovery_time_hours` window, the system MUST NOT show a warning.

#### Scenario: Adaptation warning fires

- GIVEN `recovery_time_hours = 24` and the next planned workout is 18 hours after the import
- WHEN the training evaluation is generated
- THEN `adaptation_warning` MUST contain a non-null warning message
- AND the warning is displayed prominently in `AIEvaluationCard`

#### Scenario: No next planned workout

- GIVEN the athlete has no future planned workouts
- WHEN the training evaluation is generated
- THEN `adaptation_warning` MUST be null
- AND no warning UI element is shown

#### Scenario: Next planned workout outside recovery window

- GIVEN `recovery_time_hours = 24` and the next planned workout is 36 hours away
- WHEN the training evaluation is generated
- THEN `adaptation_warning` MUST be null

---

### REQ-6: Re-import (Workout Already Has Garmin Import)

The system SHOULD warn the athlete if the workout already has a linked Garmin import.
The system MAY allow re-import, overwriting the previous `garmin_activity_id` and deleting the old `garmin_activities` row.
The system MUST NOT create duplicate `garmin_activities` rows for the same workout.

#### Scenario: Re-import on a workout with existing import

- GIVEN a workout already has a `garmin_activity_id`
- WHEN the athlete uploads a new `.fit` file via the modal
- THEN the system MUST display a confirmation warning before proceeding
- AND on confirmation, the old `garmin_activities` row is deleted and replaced with the new one

---

### REQ-7: Authorization and Data Isolation

The system MUST enforce RLS on `garmin_activities` and `training_evaluations` so athletes can only read/write their own rows.
The `garmin-fits` Storage bucket MUST enforce per-owner access via RLS.
Edge Functions MUST verify the authenticated user owns the target `workout_id` before processing.

#### Scenario: Unauthorized import attempt

- GIVEN an athlete attempts to import a FIT file for a workout they do not own
- WHEN the `garmin-import` Edge Function receives the request
- THEN the function MUST return a 403 error
- AND no data is written to Storage or the database

---

## Non-Functional Requirements

| #     | Requirement                                                                                  |
| ----- | -------------------------------------------------------------------------------------------- |
| NFR-1 | `garmin-import` MUST respond in < 3 s for files ≤ 10 MB (parse + store, excluding AI eval)   |
| NFR-2 | `training-evaluation` SHOULD complete in < 8 s under normal LLM latency                      |
| NFR-3 | The UI MUST show a loading skeleton in `AIEvaluationCard` while the evaluation is pending    |
| NFR-4 | Upload errors MUST be surfaced in the modal with actionable messages; no silent failures     |
| NFR-5 | All new DB tables MUST have RLS enabled with explicit owner-scoped policies                  |
| NFR-6 | FIT Storage files MUST be named `{user_id}/{workout_id}/{timestamp}.fit` to avoid collisions |
