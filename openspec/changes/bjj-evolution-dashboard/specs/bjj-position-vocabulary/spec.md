---
name: bjj-position-vocabulary
description: Delta spec for the bjj_positions lookup table. Canonical 11+ keys with EN/ES display labels, seed data, shared getPositionLabel helper, and AI prompt enforcement.
change: bjj-evolution-dashboard
status: draft
---

# Delta for BJJ Position Vocabulary

> **Domain**: `bjj-position-vocabulary`
> **Change**: `bjj-evolution-dashboard`
> **Spec source**: New — no existing `openspec/specs/bjj-position-vocabulary/spec.md` to delta against. All requirements are `ADDED`.

---

## Purpose

Canonical position vocabulary for roll events, shared between the Roll Review form, the `RollFlowWidget` display labels, the `bjj_dashboard_data` RPC's display lookup, and the `bjj-section-ai` prompt extension. The lookup table is the single source of truth; no client writes, only reads.

---

## ADDED Requirements

### REQ-PV1: bjj_positions Table Schema

The system MUST create the `bjj_positions` lookup table in `supabase/migrations/20260612000002_bjj_positions.sql` with the following schema:

| Column | Type | Constraint |
| --- | --- | --- |
| `key` | `text` | PRIMARY KEY |
| `display_en` | `text` | NOT NULL |
| `display_es` | `text` | NOT NULL |
| `display_order` | `int` | NOT NULL |

The migration MUST be idempotent: re-running it MUST NOT error if the table exists (use `CREATE TABLE IF NOT EXISTS`).

#### Scenario: Migration creates the lookup table

- GIVEN a fresh database
- WHEN the migration runs
- THEN the `bjj_positions` table MUST exist with 4 columns
- AND the primary key on `key` MUST be enforced

---

### REQ-PV2: Seed Data

The migration MUST seed the table with the 11 canonical keys from PRD §6.7 plus any finish-node keys the design needs (e.g. `submission_finish` for sentinel values). Seed MUST include:

| `key` | `display_en` | `display_es` | `display_order` |
| --- | --- | --- | --- |
| `standing` | `Standing` | `De pie` | 1 |
| `closed_guard` | `Closed guard` | `Guardia cerrada` | 2 |
| `open_guard` | `Open guard` | `Guardia abierta` | 3 |
| `half_guard` | `Half guard` | `Media guardia` | 4 |
| `side_control` | `Side control` | `Control lateral` | 5 |
| `mount` | `Mount` | `Montada` | 6 |
| `back_control` | `Back control` | `Control de espalda` | 7 |
| `turtle` | `Turtle` | `Tortuga` | 8 |
| `knee_on_belly` | `Knee on belly` | `Rodilla en el estómago` | 9 |
| `leg_entanglement` | `Leg entanglement` | `Enredo de piernas` | 10 |
| `other` | `Other` | `Otro` | 11 |

The seed MUST use `INSERT ... ON CONFLICT (key) DO NOTHING` for idempotency.

#### Scenario: Migration seeds 11 rows

- GIVEN a fresh database
- WHEN the migration runs
- THEN `bjj_positions` MUST contain exactly 11 rows (11 base keys)
- AND running the migration again MUST NOT change the row count

#### Scenario: Display labels are bilingual

- GIVEN a position with `key = 'mount'`
- WHEN the helper resolves the label
- THEN `display_en` MUST be `"Mount"`
- AND `display_es` MUST be `"Montada"`

---

### REQ-PV3: getPositionLabel Helper

The system MUST expose a typed helper `getPositionLabel(key: BJJPositionKey, locale: 'en' | 'es')` in a shared module (proposed: `src/features/bjj/position-vocabulary.ts` or `src/features/bjj/utils/position-vocabulary.ts`).

The helper MUST:
- Take a `BJJPositionKey` (a string-literal union of the 11+ seeded keys).
- Take a locale (`'en' | 'es'`).
- Return the corresponding `display_en` or `display_es` string.
- Throw (or return `'other'`-labeled fallback) if the key is unknown — design decision: throw in dev/test, return the `other` label in prod with a console.warn.

#### Scenario: EN locale returns display_en

- GIVEN `getPositionLabel('mount', 'en')`
- WHEN the function is called
- THEN it MUST return `"Mount"`

#### Scenario: ES locale returns display_es

- GIVEN `getPositionLabel('mount', 'es')`
- WHEN the function is called
- THEN it MUST return `"Montada"`

#### Scenario: Unknown key falls back to other in prod

- GIVEN an unknown key `'knee_on_belly_pizza'`
- WHEN `getPositionLabel` is called in production mode
- THEN it MUST return the `display_en` or `display_es` of `other`
- AND a `console.warn` MUST log the unknown key

---

### REQ-PV4: Roll Review Form Selects

The `RollReviewPanel` (REQ-RE8) MUST render `position_from` and `position_to` as `<Select>` controls populated from `bjj_positions`. The Select MUST show `display_en` (English UI per NFR-07) but MUST submit the `key` value to `bjj_roll_events.position_from` / `position_to`.

#### Scenario: Position select shows English labels and submits keys

- GIVEN a row in `RollReviewPanel` with `position_from = 'closed_guard'`
- WHEN the row is saved
- THEN the upsert MUST write `'closed_guard'` (the key) to `bjj_roll_events.position_from`
- AND the option label in the UI MUST be `"Closed guard"` (display_en)

#### Scenario: position_to is optional

- GIVEN the user leaves `position_to` blank in the form
- WHEN the row is saved
- THEN `bjj_roll_events.position_to` MUST be `null`

---

### REQ-PV5: RollFlowWidget Display Labels

The `RollFlowWidget` MUST render `from` / `to` strings as resolved display labels, not raw keys. The labels MUST be looked up via `getPositionLabel(key, 'en')` on the client (or by the RPC and embedded in `BJJDashboardData.roll_flow.edges[].from` / `.to`).

#### Scenario: Flow row shows English labels

- GIVEN a transition with `position_from = 'closed_guard'`, `position_to = 'mount'`
- WHEN the widget renders
- THEN the row MUST display `"Closed guard"` → `"Mount"`
- AND the underlying data field MUST be the human-readable label, not the raw key

#### Scenario: Unknown position falls back to other

- GIVEN a transition with `position_from = 'unknown_position'` (corrupted data)
- WHEN the widget renders
- THEN the row MUST display the `other` label
- AND a console warning MUST be logged

---

### REQ-PV6: bjj_dashboard_data RPC Display Lookup

The `bjj_dashboard_data` RPC MUST use `bjj_positions` to resolve `position_from` and `position_to` keys to their `display_en` labels when building the `roll_flow.edges[].from` / `.to` fields. The RPC MUST NOT use a hardcoded list — it MUST join or LEFT JOIN against `bjj_positions` and fall back to the `other` label for unknown keys.

#### Scenario: RPC resolves keys to display_en

- GIVEN a transition `(closed_guard → mount)` exists in confirmed roll events
- WHEN the RPC builds the `roll_flow.edges[]` array
- THEN the edge MUST have `from = 'Closed guard'`, `to = 'Mount'`

#### Scenario: Unknown position falls back to other

- GIVEN a transition `(unknown_position → mount)` exists in confirmed roll events
- WHEN the RPC builds the array
- THEN the edge MUST have `from = 'Other'` (the fallback label)
- AND no error MUST be raised

---

### REQ-PV7: AI Prompt Extension — Use Canonical Keys

The `bjj-section-ai` system prompt MUST instruct the LLM that `position_from` and `position_to` MUST be one of the canonical `bjj_positions.key` values (the prompt MAY include the list of keys inline for grounding). Rows with unknown keys MUST be flagged for human review, not silently dropped.

Recommended behavior (proposal):
- Unknown key: keep the roll in the response with `position_from` set to the unknown key, set `confidence = 0`, and add a `validation_error: 'unknown_position_from'` field to the roll object.
- The `RollReviewPanel` MUST surface these flagged rows with a warning chip.

#### Scenario: LLM proposes a roll with a canonical key

- GIVEN a roll is proposed with `position_from = 'closed_guard'`
- WHEN the response is reviewed
- THEN `position_from` MUST match a seeded `bjj_positions.key`
- AND the `RollReviewPanel` MUST NOT show a validation warning for this row

#### Scenario: LLM proposes a roll with an unknown key

- GIVEN the LLM proposes `position_from = 'knee_on_belly_pizza'` (a free-text variant)
- WHEN the response is reviewed
- THEN the roll MUST have `confidence = 0` and `validation_error: 'unknown_position_from'`
- AND the `RollReviewPanel` MUST render a warning chip on that row
- AND on save, the row MUST be persisted as `position_from = 'other'` (fallback) with `confidence = 0` for the dashboard to count it but flag it

---

### REQ-PV8: RLS — Read-Only for Authenticated Users

RLS MUST be enabled on `bjj_positions` with a SELECT policy allowing any authenticated user to read. No INSERT/UPDATE/DELETE policy is granted to authenticated users (the table is seed-only; only service-role or migration scripts can write).

#### Scenario: Authenticated user can read bjj_positions

- GIVEN an authenticated user
- WHEN the user queries `bjj_positions`
- THEN ALL 11 seeded rows MUST be returned
- AND the user MUST NOT see any other user's data (irrelevant; the table is global seed)

#### Scenario: Authenticated user cannot write to bjj_positions

- GIVEN an authenticated user
- WHEN the user attempts to insert or update a row in `bjj_positions`
- THEN the operation MUST be rejected by RLS (0 rows affected)

---

## MODIFIED Requirements

None — this is a new capability.

---

## REMOVED Requirements

None.

---

## RENAMED Requirements

None.
