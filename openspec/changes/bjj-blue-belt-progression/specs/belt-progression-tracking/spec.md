# Delta for belt-progression-tracking

> **Domain**: `belt-progression-tracking`
> **Status**: Active
> **Change**: bjj-blue-belt-progression

---

## Purpose

Self-service checklist for BJJ athletes to track 45 blue belt requirements across 5 sections, with Supabase-persisted checkmarks, collapsible sections, and real-time progress percentages.

---

## ADDED Requirements

### REQ-BP1: Progression Data Model

The system MUST store blue belt progression in two tables:

**`belt_progression`** — checkbox state per user/item:

| Column         | Type       | Notes                                      |
|----------------|------------|--------------------------------------------|
| `id`           | uuid       | PK, default `gen_random_uuid()`            |
| `user_id`      | uuid       | FK → `auth.users(id)` ON DELETE CASCADE    |
| `belt_level`   | text       | `'blue'` for MVP                           |
| `section_id`   | text       | Section identifier (e.g. `tecnicas`)       |
| `item_id`      | text       | Item identifier (e.g. `tecnicas-comienzo-item-0`) |
| `is_complete`  | boolean    | Default `false`                           |
| `completed_at` | timestamptz| Null when incomplete                      |
| `technique_id` | uuid       | Optional FK → `bjj_techniques(id)`        |
| `created_at`   | timestamptz| Default `now()`                           |
| `updated_at`   | timestamptz| Auto-set on update via trigger            |

Unique constraint: `(user_id, belt_level, section_id, item_id)`

**`belt_progression_ui_state`** — collapse state per user/section:

| Column       | Type       | Notes                                     |
|--------------|------------|-------------------------------------------|
| `id`         | uuid       | PK                                        |
| `user_id`    | uuid       | FK → `auth.users(id)` ON DELETE CASCADE  |
| `belt_level` | text       | `'blue'`                                  |
| `section_id` | text       | Section identifier                        |
| `is_expanded`| boolean    | Default `false` (collapsed)               |
| `updated_at` | timestamptz| Auto-set on update                       |

Unique constraint: `(user_id, belt_level, section_id)`

Both tables MUST enable RLS. Policies MUST allow users to CRUD only their own rows: `auth.uid() = user_id`.

Indexes MUST exist on `user_id` for both tables.

---

### REQ-BP2: Section Data Structure

The system MUST define 45 progression items as TypeScript constants in `belt-progression-sections.ts`.

Section structure: `{ id, title, isInformational, items[] }`
Item structure: `{ id, label, techniqueId?: string, category?: string }`

| Section | ID | Items | Checkable | Denominator |
|---------|----|-------|-----------|-------------|
| 1. Pilares del JiuJitsu | `pilares` | 10 | No (informational) | Excluded |
| 2. Técnicas Requeridas | `tecnicas` | 32 | Yes | Included |
| 3. Sparring Skills | `sparring` | 6 | Yes | Included |
| 4. Requisitos Adicionales | `requisitos` | 6 | Yes | Included |
| 5. Bonus | `bonus` | 1 | Yes | Included |
| **Total** | | **45** | **45** | **45** |

---

### REQ-BP3: Progress Calculation

The system MUST calculate progress as: `(checked_count / total_checkable) * 100`, rounded to nearest integer.

- Section 1 (Pilares) is **excluded** from global progress denominator
- Global progress denominator = 45 (Sections 2–5 combined)
- Section progress excludes its own informational items

---

### REQ-BP4: Checkbox Toggle

The system MUST toggle an item's completion state via Supabase upsert on `belt_progression`.

On toggle ON: set `is_complete = true`, `completed_at = now()`
On toggle OFF: set `is_complete = false`, `completed_at = null`

Toggle MUST be atomic per item. No partial updates.

---

### REQ-BP5: Section Collapse State

The system MUST persist section collapse state per user in `belt_progression_ui_state`.

On toggle: upsert `is_expanded` for `(user_id, belt_level, section_id)`.
All sections MUST start **collapsed by default** on first visit (enforced client-side via TanStack Query initial data).

---

### REQ-BP6: Reset All Progress

The system MUST delete all `belt_progression` rows for the authenticated user when reset is confirmed.

Reset is a destructive action. It MUST require confirmation via Dialog before executing.
After reset, progress bars MUST reflect 0% for all sections.

---

### REQ-BP7: API — No Edge Functions

All reads and writes MUST use direct Supabase client queries (no Edge Functions).
RLS enforces user isolation: `auth.uid() = user_id` in all policies.

---

### REQ-BP8: Route Registration

The system MUST expose the progression page at `/bjj/blue-belt-progression`.

Route MUST be added to `src/routes.ts`. Navigation link MUST appear in BJJ section of AppShell or workouts nav.

---

## MODIFIED Requirements

None — this is a new capability.

---

## REMOVED Requirements

None.

---

## Scenarios

### Scenario: Check item persists across refresh

- GIVEN user is authenticated and on `/bjj/blue-belt-progression`
- WHEN user checks a checkbox (e.g., "Double Leg")
- THEN the item is upserted to `belt_progression` with `is_complete: true`
- AND the global progress bar updates immediately
- AND on page reload, the checkbox remains checked

### Scenario: Uncheck item

- GIVEN user has checked "Double Leg"
- WHEN user unchecks the checkbox
- THEN `is_complete` is set to `false`, `completed_at` to `null`
- AND progress recalculates

### Scenario: Collapse section persists

- GIVEN user expands Section 2 (Técnicas Requeridas)
- WHEN user clicks the section header to collapse it
- THEN `belt_progression_ui_state` is upserted with `is_expanded: false`
- AND on page reload, the section remains collapsed

### Scenario: First visit — all collapsed

- GIVEN user has no `belt_progression_ui_state` rows
- WHEN user visits `/bjj/blue-belt-progression` for the first time
- THEN all sections render in collapsed state (client-side initial data `{ isExpanded: false }`)

### Scenario: Reset with confirmation

- GIVEN user has 12 items checked across sections
- WHEN user clicks "Reiniciar Progreso"
- THEN a confirmation Dialog appears with warning text
- WHEN user confirms
- THEN all `belt_progression` rows for the user are deleted
- AND all progress bars show 0%

### Scenario: Reset cancelled

- GIVEN user has items checked
- WHEN user clicks "Reiniciar Progreso"
- AND user clicks "Cancel" in the Dialog
- THEN no rows are deleted
- AND all checkboxes remain checked

### Scenario: Global progress calculation — edge cases

- GIVEN user has 0 items checked
- WHEN progress is calculated
- THEN result is 0% (0/45 * 100)
- AND GIVEN user has 22 items checked
- THEN result is 49% (22/45 * 100, rounded)
- AND GIVEN user has 45 items checked
- THEN result is 100% (45/45 * 100)

### Scenario: Section with no checkable items

- GIVEN user is on Section 1 (Pilares — informational)
- THEN no checkboxes are rendered
- AND section progress bar shows 100% (informational section, not tracked)

### Scenario: Keyboard navigation — checkbox

- GIVEN user tabs to a checkbox
- WHEN user presses Space
- THEN the checkbox toggles
- AND the checkbox has `aria-checked` reflecting its state

### Scenario: Keyboard navigation — section collapse

- GIVEN user tabs to a section header
- WHEN user presses Enter
- THEN the section expands/collapses
- AND the header has `aria-expanded` reflecting its state

### Scenario: axe-core — no critical violations

- GIVEN the page renders at `/bjj/blue-belt-progression`
- WHEN axe-core runs
- THEN 0 critical violations are reported