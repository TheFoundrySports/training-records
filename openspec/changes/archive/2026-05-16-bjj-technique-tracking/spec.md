---
name: technique-tracking
description: Delta spec for BJJ technique tracking and learning validation. Tracks practice frequency, computes learned status, surfaces suggestions in Blue Belt Progression Tracker.
change: bjj-technique-tracking
status: draft
---

# Delta for Technique Tracking

> **Domain**: `technique-tracking`
> **Change**: `bjj-technique-tracking`

---

## ADDED Requirements

### REQ-TT1: Practice Frequency Aggregation

The system MUST track how many times each user practices each technique across all BJJ workouts via the `technique_practice_log` table.

The system MUST upsert `technique_practice_log` when a row is inserted into `bjj_section_techniques`, incrementing `total_practices` and updating `last_practiced_at`. On first insert, `first_practiced_at` MUST be set from the parent workout's `performed_at`.

The `user_id` is derived from the parent workout via the `bjj_sections` join.

#### Scenario: Practice count increments on new technique linking

- GIVEN a BJJ workout exists with `performed_at = 2026-05-10`
- WHEN the athlete's AI-enhanced section stores `[Knee Slide Pass]` in `bjj_section_techniques`
- THEN the system MUST create (or upsert) a `technique_practice_log` row with `total_practices = 1`, `first_practiced_at = 2026-05-10`, `last_practiced_at = 2026-05-10`
- AND subsequent inserts for the same (user_id, technique_id) MUST increment `total_practices` and update `last_practiced_at`

#### Scenario: Multiple techniques in same section

- GIVEN a BJJ section links 3 techniques to `bjj_section_techniques`
- WHEN the trigger fires for each insert
- THEN the system MUST create 3 separate `technique_practice_log` rows (one per technique_id)
- AND each row's `total_practices = 1` on first insert

---

### REQ-TT2: Learning Status Computation

The system MUST compute whether a user has "learned" a technique via the `technique_learning_status` view, joining `technique_practice_log` with `technique_learning_thresholds`.

The `is_learned` field MUST be `true` when `total_practices >= coalesce(required_practices, 10)`.

Authenticated users MUST be able to read the view. Only admins MAY write to `technique_learning_thresholds`.

#### Scenario: Learned status true when threshold met

- GIVEN a user has `total_practices = 12` for "Triangle Choke" and `required_practices = 10`
- WHEN the system queries `technique_learning_status` for that user and technique
- THEN `is_learned` MUST be `true`

#### Scenario: Learned status false when below threshold

- GIVEN a user has `total_practices = 5` for "Armbar" and `required_practices = 8`
- WHEN the system queries `technique_learning_status` for that user and technique
- THEN `is_learned` MUST be `false`

#### Scenario: Default threshold when no explicit threshold

- GIVEN a user has `total_practices = 10` for "Kimura" with no row in `technique_learning_thresholds`
- WHEN the system queries `technique_learning_status`
- THEN `required_practices` MUST default to `10`
- AND `is_learned` MUST be `true`

---

### REQ-TT3: Practice Counter Badge Display

The system MUST display an inline practice counter badge next to each technique item in the Blue Belt Progression Tracker (Section 2: Técnicas Requeridas).

The badge MUST show `"Practiced X/Y times"` where X = `total_practices`, Y = `required_practices`.

Color coding:
- Gray (`bg-gray-200 text-gray-700`) when X = 0
- Amber (`bg-amber-100 text-amber-800`) when 0 < X < Y
- Green (`bg-green-100 text-green-800`) when X >= Y

The badge MUST be clickable and open the workout history modal. The badge MUST have an `aria-label` describing count, threshold, and validation status.

#### Scenario: Badge shows amber when in progress

- GIVEN a technique has `total_practices = 6` and `required_practices = 10`
- WHEN the progression page renders
- THEN the badge MUST display `"Practiced 6/10"`
- AND the badge color MUST be amber

#### Scenario: Badge shows green when validated

- GIVEN a technique has `total_practices = 12` and `required_practices = 10`
- WHEN the progression page renders
- THEN the badge MUST display `"Practiced 12/10 ✅"`
- AND the badge color MUST be green

---

### REQ-TT4: Suggestion Panel — Recently Practiced Techniques

The system MUST display a `TechniqueSuggestionPanel` at the top of the Blue Belt Progression page, surfacing techniques practiced in the last 30 days that are not yet marked complete in `belt_progression`.

The panel MUST show at most 5 suggestions, ordered by `last_practiced_at` descending.

Each suggestion MUST display: technique name, practice count, and last practiced date.

The panel MUST provide a one-click "Mark as Complete" button that calls the existing `belt_progression` upsert mutation, setting `is_complete = true` and `completed_at = now()`.

The user MAY dismiss individual suggestions or the entire panel for the session (via `localStorage`).

#### Scenario: Suggestion panel shows recently practiced techniques

- GIVEN a user practiced "Triangle Choke" on 2026-05-10 with count 12, and "Armbar" on 2026-05-08 with count 3
- AND neither is marked complete in `belt_progression`
- WHEN the progression page loads
- THEN the suggestion panel MUST display both techniques, ordered by last practiced date

#### Scenario: Clicking "Mark as Complete" updates belt progression

- GIVEN a suggestion for "Triangle Choke" is visible
- WHEN the user clicks "Mark as Complete"
- THEN `belt_progression` row MUST be upserted with `is_complete = true`, `completed_at = now()`
- AND the panel MUST refresh and remove the marked item from suggestions

---

### REQ-TT5: Workout History Modal

The system MUST display a `TechniquePracticeModal` when the user clicks a practice counter badge, showing all workouts where the technique was practiced.

The modal MUST display: workout date, section goal, and truncated AI description.

Each workout entry MUST have a clickable link to the full workout detail page.

#### Scenario: Modal opens on badge click

- GIVEN a user clicks the "Practiced 12/10" badge for "Triangle Choke"
- WHEN the modal opens
- THEN it MUST display up to 20 most recent workouts containing that technique
- AND each entry shows date, goal, and truncated AI description

#### Scenario: Workout entries link to detail page

- GIVEN a workout entry is shown in the modal
- WHEN the user clicks the entry
- THEN the browser MUST navigate to the workout detail page for that workout

---

### REQ-TT6: Historical Backfill

The system MUST run a one-time migration to populate `technique_practice_log` from existing `bjj_section_techniques` data, counting occurrences per (user_id, technique_id) from all historical BJJ workouts.

The migration MUST use `INSERT ... ON CONFLICT DO NOTHING` to avoid overwriting data from real-time triggers.

#### Scenario: Backfill aggregates existing junction table data

- GIVEN a user has 5 historical BJJ workouts with "Triangle Choke" in `bjj_section_techniques`
- WHEN the backfill migration runs
- THEN `technique_practice_log` MUST contain a row with `total_practices = 5`
- AND `first_practiced_at` MUST be the earliest workout date
- AND `last_practiced_at` MUST be the latest workout date

#### Scenario: Backfill is idempotent

- GIVEN the backfill migration has already run once
- WHEN it runs again
- THEN no duplicate rows MUST be created due to `ON CONFLICT DO NOTHING`

---

## MODIFIED Requirements

### REQ-AI1: AI Enhance with Bracketed Technique Names

The system MUST modify the `bjj-section-ai` Edge Function prompt to instruct the model to append bracketed canonical English names immediately after each technique mention in the `ai_description`.

Format: `[Canonical Name]` where the name MUST exactly match the `name` field from `bjj_techniques`.

The AI MUST only bracket techniques with clear evidence from the athlete's `raw_description`. If uncertain, the AI MUST NOT bracket.

Backend parsing extracts names via regex `/\[([^\]]+)\]/g`, matches to `bjj_techniques.name`, and stores UUIDs in `bjj_section_techniques` via the existing mechanism.

The AI response schema (`ai_description`, `matched_technique_ids`) remains unchanged.

(Previously: AI returned plain Spanish text with no machine-parseable technique references)

#### Scenario: AI output includes bracketed technique names

- GIVEN an athlete's raw description mentions "triangulo" and the technique catalog includes "Triangle Choke"
- WHEN `bjj-section-ai` generates the enhanced description
- THEN `ai_description` MUST include `[Triangle Choke]` after the technique reference
- AND the output example: `"Trabajamos sumisiones [Triangle Choke] desde guardia cerrada."`

#### Scenario: Uncertain techniques are not bracketed

- GIVEN the AI is uncertain whether a technique from the catalog was practiced
- WHEN generating `ai_description`
- THEN the AI MUST NOT bracket that technique name
- AND the technique MUST NOT appear in `matched_technique_ids`

---

## Data Model

| Table / View | Purpose |
|---|---|
| `technique_practice_log` | Per-user per-technique aggregate: total_practices, first/last_practiced_at |
| `technique_learning_thresholds` | Per-technique override of required_practices (default: 10) |
| `technique_learning_status` | View: join practice log + thresholds → is_learned |
| `technique_practice_log_trigger` | AFTER INSERT on `bjj_section_techniques` → upsert practice log |

## Frontend Contracts

| Component | Props | Behavior |
|---|---|---|
| `TechniquePracticeBadge` | `count: number`, `threshold: number`, `isLearned: boolean`, `onClick: () => void` | Renders color-coded badge with aria-label |
| `TechniquePracticeModal` | `techniqueId: string`, `techniqueName: string`, `open: boolean`, `onClose: () => void` | Shows workout list with links |
| `TechniqueSuggestionPanel` | `userId: string` | Fetches last-30-day techniques, "Mark as Complete" button |

## Edge Function Prompt Change

In `supabase/functions/bjj-section-ai/prompt.ts`, add after line 32:

```
When you mention a technique, immediately append its canonical English name
in square brackets like this: "pasajes [Knee Slide Pass]".

Rules for bracketed technique names:
- Use ONLY canonical names from the technique catalog (the "name" field)
- Only bracket techniques you are confident the athlete practiced
- If uncertain, do not bracket — prefer precision over recall
```