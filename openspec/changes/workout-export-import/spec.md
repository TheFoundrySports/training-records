---
name: workout-export-import
description: Export workouts to JSON and import them back. Single-workout and all-workouts export from the UI. Import via modal with file picker.
change: workout-export-import
status: draft
---

# Delta for Workout Export/Import

> **Domain**: `workout-export-import`
> **Change**: `workout-export-import`

---

## MODIFIED Requirements

### REQ-EX1: Export Single Workout

The system MUST allow a user to export a single workout as a JSON file from the workout detail page.

The exported file MUST include all workout fields, plus BJJ sections and techniques (if `type=bjj`), or `wodFormat`/`wodText`/`payload` (if `type=crossfit` or `type=functional`).

**Filename**: `workout-[slugified-title]-[YYYY-MM-DD].json`

#### Scenario: BJJ workout with sections → file includes sections array with techniques

- GIVEN a user is viewing a BJJ workout with 2 sections and 3 techniques total
- WHEN the user clicks "Export"
- THEN the downloaded JSON file MUST contain the full `sections` array with nested technique data

#### Scenario: CrossFit workout → file includes wodFormat, wodText, payload

- GIVEN a user is viewing a CrossFit workout with `wodFormat=amrap`, `wodText="20 min AMRAP"`, and a `payload`
- WHEN the user clicks "Export"
- THEN the downloaded JSON file MUST contain `wodFormat`, `wodText`, and `payload` at the top level of the workout object

#### Scenario: Clicking export downloads file immediately

- GIVEN a user is on the workout detail page
- WHEN the user clicks "Export"
- THEN the browser downloads the file immediately without showing a modal or confirmation dialog

---

### REQ-EX2: Export All Workouts

The system MUST allow a user to export all their workouts as a single JSON file from the workouts list page.

The exported file MUST include all workouts with the same structure as REQ-EX1 per workout.

**Filename**: `workouts-export-[YYYY-MM-DD].json`

**JSON root structure**:
```json
{
  "version": 1,
  "exportedAt": "ISO8601",
  "workouts": [...]
}
```

#### Scenario: User with 2 BJJ + 1 CrossFit → file has 3 workouts, each with correct type-specific fields

- GIVEN a user has 2 BJJ workouts (each with sections) and 1 CrossFit workout (with wodFormat and payload)
- WHEN the user clicks "Export All"
- THEN the downloaded JSON MUST contain 3 workout objects in the `workouts` array
- AND the BJJ workouts MUST include their `sections` arrays
- AND the CrossFit workout MUST include `wodFormat`, `wodText`, and `payload`

#### Scenario: Empty workouts list → file has `"workouts": []`

- GIVEN a user has no workouts
- WHEN the user clicks "Export All"
- THEN the downloaded JSON MUST contain `{"workouts": []}` (empty array)

---

### REQ-EX3: Import Workouts

The system MUST allow a user to import workouts from a previously exported JSON file.

**Import entry point**: modal on the workouts list page.

The system MUST validate the file is valid JSON with `version: 1`.

Each workout in the import MUST be created with `auth.uid()` — the exported `userId` field is ignored.

For BJJ workouts: sections MUST be created; techniques MUST be matched by `name` in `bjj_techniques`; unmatched techniques MUST be silently omitted.

Duplicate workouts (same `title` + `performedAt`) are NOT deduplicated — new rows are created.

On success: show count of imported workouts; refresh the workouts list.

On error: show specific error message (invalid format, network error).

#### Scenario: Valid file with 2 workouts → both created, success message "2 workouts imported"

- GIVEN a user selects a valid export JSON containing 2 workouts
- WHEN the import completes successfully
- THEN the system MUST create 2 new workout rows in the database
- AND display a success message "2 workouts imported"
- AND refresh the workouts list

#### Scenario: File with unknown version → error "Unsupported format version"

- GIVEN a user selects a JSON file with `"version": 2`
- WHEN the import is attempted
- THEN the system MUST show an error "Unsupported format version"
- AND no workout rows are created

#### Scenario: BJJ workout with technique "Triangle Choke" that exists in catalog → linked correctly

- GIVEN a BJJ workout in the import file has a section containing `["Triangle Choke", "Arm Bar"]`
- AND "Triangle Choke" exists in the `bjj_techniques` table with `name='Triangle Choke'`
- WHEN the import processes that workout
- THEN the system MUST create the section
- AND link "Triangle Choke" via `bjj_section_techniques` using the matched technique ID

#### Scenario: BJJ workout with technique "Unknown Technique" → section created, technique omitted silently

- GIVEN a BJJ workout in the import file has a section containing `["Unknown Technique"]`
- AND "Unknown Technique" does NOT exist in the `bjj_techniques` table
- WHEN the import processes that section
- THEN the section row MUST be created
- AND "Unknown Technique" MUST be silently omitted (not create a broken link)
- AND no error message is shown to the user

---

### REQ-EX4: Export JSON Format

The JSON format MUST be versioned (`version: 1`) and self-contained.

**Fields to include per workout**: `title`, `type`, `performedAt`, `durationMinutes`, `rpe`, `notes`, `enhancedNotes`, `wodFormat`, `wodText`, `payload`, `sections` (BJJ only)

**Fields to EXCLUDE**: `id`, `userId`, `createdAt`, `updatedAt`, `garminActivityId`

**Techniques in export** (BJJ sections): `name`, `category`, `nameEs` — enough for name-matching on import.

---

## Data Model

No new tables. No schema changes.

---

## Capabilities

### workout-export
Download a single workout or all workouts as versioned JSON. Pure client-side using `URL.createObjectURL`.

### workout-import
Parse exported JSON and recreate workout rows with BJJ section structure. Sequential Supabase mutations with technique name matching.