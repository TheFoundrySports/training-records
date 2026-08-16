---
name: bjj-workout-form
description: Delta spec for BJJ workout form UX — Open Design forms.html parity while preserving section-based domain model.
change: bjj-form-open-design-parity
status: draft
---

# BJJ Workout Form Specification

> **Domain**: `bjj-workout-form`
> **Change**: `bjj-form-open-design-parity`
> **Design reference**: Open Design `forms.html` (project `5e17c655-dae0-443c-b191-c1967d177f4b`)
> **Spec source**: New domain — no existing `openspec/specs/bjj-workout-form/spec.md`

---

## Purpose

Define the athlete-facing BJJ workout registration form: Material shell, stepper navigation, section-based training blocks, technique selection, aggregated roll review, and save pipeline. Requirements preserve the section model, canonical position keys, Option A validation, and post-save `useConfirmRolls` flow from `bjj-evolution-dashboard`.

---

## Requirements

### REQ-WF1: Material Form Shell

The BJJ workout form page (`/bjj/workouts/new`, `/bjj/workouts/:id/edit`) MUST render inside the `.bjj-form` Material scope with:

- A four-step stepper (Session → Sections → Rolls → Review)
- A two-column layout: main form cards + sticky summary sidebar
- A fixed bottom action bar with contextual status message and primary save action

#### Scenario: Stepper scrolls to section anchors

- GIVEN the athlete is on the BJJ workout form
- WHEN they click step 1, 2, 3, or 4 in the stepper
- THEN the viewport MUST scroll smoothly to `#cardSession`, `#cardSections`, `#cardRolls`, or `#cardReview` respectively
- AND each target element MUST exist in the DOM when that step is reachable

#### Scenario: Action bar reflects validation state

- GIVEN the form has invalid roll positions (Option A `validation_error`)
- WHEN the athlete views the action bar
- THEN the status message MUST instruct them to fix roll positions before saving
- AND the primary save button MUST be disabled (`canSubmit === false`)

---

### REQ-WF2: Session Card

The session card (`#cardSession`) MUST collect workout metadata required by `bjjWorkoutSchema`: title, performed-at datetime, duration, RPE, and notes.

#### Scenario: Minimum session fields block save

- GIVEN title is empty OR duration is below 1 minute
- WHEN the athlete attempts to save
- THEN save MUST be blocked
- AND the action bar MUST surface a session validation message

---

### REQ-WF3: Section-Based Training Blocks

The form MUST support one or more training sections. Each section MUST include a goal, technique picker, and optional AI enhance. Sections MUST NOT be collapsed into a single global technique card.

#### Scenario: Each section requires a goal

- GIVEN a section with an empty goal
- WHEN progress is computed
- THEN the Sections step MUST NOT be marked done
- AND save MUST be blocked until every section has a non-empty goal

#### Scenario: AI enhance proposes rolls per section

- GIVEN the athlete runs AI enhance on a section
- WHEN the Edge Function returns rolls
- THEN proposed rolls MUST be stored on that section's `rolls[]` in React Hook Form state
- AND rolls from all sections MUST be aggregatable for review (REQ-WF4)

---

### REQ-WF4: Dedicated Roll Review Card

When any section has proposed rolls, the page MUST render a dedicated `#cardRolls` card separate from inline section editors. The stepper Rolls step MUST target `#cardRolls`.

#### Scenario: Roll card visible with aggregated drafts

- GIVEN section A has 2 proposed rolls and section B has 1 proposed roll
- WHEN the athlete views the form
- THEN `#cardRolls` MUST be present in the DOM
- AND the card MUST list all 3 rolls (with section context or equivalent grouping)
- AND clicking stepper step 3 MUST scroll to `#cardRolls`

#### Scenario: Empty roll card guidance

- GIVEN no section has proposed rolls
- WHEN the athlete views `#cardRolls`
- THEN the card MUST show guidance to run AI enhance on a section (or equivalent empty state)
- AND save MUST remain allowed if Option A validation passes (zero rolls is valid)

#### Scenario: Summary shows roll progress

- GIVEN N total proposed rolls and M rolls marked confirmed (client draft state)
- WHEN the summary sidebar renders roll status
- THEN it MUST display confirmed progress in the pattern `M of N` (or equivalent)
- AND invalid rolls (`validation_error`) MUST be distinguishable from unconfirmed rolls

---

### REQ-WF5: Per-Roll Review Interaction

Each roll row in `#cardRolls` MUST support read and edit modes aligned with Open Design `forms.html`, while preserving canonical position selects for data integrity.

#### Scenario: Read view shows flow summary

- GIVEN a roll with `position_from = 'closed_guard'` and `position_to = 'mount'`
- WHEN the roll is in read mode
- THEN the UI MUST display human-readable position labels in an arrow chain (read-only)
- AND MUST NOT expose free-text position entry that bypasses `bjj_positions` keys

#### Scenario: Confirm toggles client draft state

- GIVEN a valid roll row (no `validation_error`)
- WHEN the athlete clicks Confirm
- THEN the roll MUST be marked confirmed in client state
- AND the summary confirmed count MUST increment

#### Scenario: Discard removes draft roll

- GIVEN a proposed roll in form state
- WHEN the athlete clicks Discard
- THEN the roll MUST be removed from that section's `rolls[]`
- AND summary totals MUST update

#### Scenario: Edit reveals position selects

- GIVEN a roll in read mode
- WHEN the athlete clicks Edit
- THEN role, outcome, and position `<Select>` controls MUST be shown
- AND edits MUST update the same RHF draft object used on save

---

### REQ-WF6: Option A Validation Gate (unchanged contract)

Save MUST remain blocked when any roll draft carries `validation_error`. Canonical position keys MUST be submitted to `useConfirmRolls` after workout RPC success.

#### Scenario: Invalid position blocks save

- GIVEN a roll with `validation_error` set
- WHEN the athlete views the form
- THEN `canSubmit` MUST be false
- AND the action bar MUST name how many rolls need fixing

#### Scenario: Save order preserved

- GIVEN all validation passes
- WHEN the athlete saves the workout
- THEN the workout RPC MUST complete before roll confirmation inserts run
- AND `useConfirmRolls` MUST attach `user_id` from the authenticated session

---

### REQ-WF7: Technique Picker UX

The technique picker (`TechniqueSearch`) MUST support search and category chip filters consistent with Open Design `#cardTech`, scoped per section.

#### Scenario: Category chips filter results

- GIVEN the technique catalog includes multiple categories
- WHEN the athlete selects a category chip
- THEN the pick list MUST show only techniques in that category
- AND clearing the chip MUST restore the full filtered-by-search list

#### Scenario: Empty search state

- GIVEN search + filter match zero techniques
- WHEN results render
- THEN an empty-state message MUST be shown (not a blank list)

---

### REQ-WF8: Review Step and Notes (Phase D)

The review card (`#cardReview`) MUST summarize session readiness. Session notes MAY be presented in `#cardReview` or `#cardNotes` with a character counter (max 500) when Phase D ships.

#### Scenario: Review step at 100% progress

- GIVEN session, sections, and rolls validation all pass
- WHEN progress reaches 100%
- THEN the Review stepper step MUST be marked current
- AND the summary tag MUST indicate complete or ready-to-save state

---

### REQ-WF9: Save Draft (Phase E — optional)

When Phase E is implemented, the action bar MUST offer Save draft that persists in-progress form values to `localStorage` keyed by user id, restorable on return to new workout.

#### Scenario: Draft restore prompt

- GIVEN a saved draft exists for the current user
- WHEN the athlete opens `/bjj/workouts/new`
- THEN the app SHOULD offer to restore or discard the draft
- AND restoring MUST repopulate RHF default values without bypassing validation on save

---

## Non-Requirements (explicit)

- Replacing section-based workouts with OD's flat session model
- Free-text position flows instead of `bjj_positions.key`
- OD Registrar topbar / cross-app navigation
- Backend-synced drafts (localStorage MVP only in Phase E)
- In-app theme toggle (system `prefers-color-scheme` remains)

---

## Traceability

| Requirement | Phase | Primary files |
|-------------|-------|---------------|
| REQ-WF1 | Shipped (v1) + A | `BJJWorkoutFormPage.tsx`, `BJJFormStepper.tsx`, `BJJFormActionBar.tsx` |
| REQ-WF2 | Shipped | `BJJWorkoutFormPage.tsx`, `bjj.schema.ts` |
| REQ-WF3 | Shipped | `BJJSectionEditor.tsx` |
| REQ-WF4 | A | `BJJWorkoutFormPage.tsx`, `useBJJFormProgress.ts` |
| REQ-WF5 | B | `RollReviewPanel.tsx` |
| REQ-WF6 | Shipped | `bjj.schema.ts`, `useConfirmRolls.ts` |
| REQ-WF7 | C | `TechniqueSearch.tsx` |
| REQ-WF8 | D | `BJJWorkoutFormPage.tsx` |
| REQ-WF9 | E | `useBJJWorkoutDraft.ts`, `BJJFormActionBar.tsx` |
