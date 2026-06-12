---
name: bjj-roll-events
description: Delta spec for the bjj_roll_events data domain. New table, 4 enums, RLS, 3 SQL views, bjj_dashboard_data RPC, RollReviewPanel, extended bjj-section-ai response, and backfill.
change: bjj-evolution-dashboard
status: draft
---

# Delta for BJJ Roll Events

> **Domain**: `bjj-roll-events`
> **Change**: `bjj-evolution-dashboard`
> **Spec source**: New — no existing `openspec/specs/bjj-roll-events/spec.md` to delta against. All requirements are `ADDED`.

---

## Purpose

Persist hybrid-captured roll events: the `bjj-section-ai` Edge Function proposes structured rolls, the athlete reviews/edits/confirms in `RollReviewPanel`, confirmed rows feed the role balance, outcomes, and roll flow widgets. The data layer guarantees user isolation via RLS, aggregates from `status='confirmed'` rows only, and survives a workout delete via the existing `ON DELETE CASCADE` chain.

---

## ADDED Requirements

### REQ-RE1: bjj_roll_events Table Schema

The system MUST create the `bjj_roll_events` table in `supabase/migrations/20260612000001_bjj_roll_events.sql` with the following schema (PRD §6.9):

| Column | Type | Constraint |
| --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `user_id` | `uuid` | FK → `auth.users(id)` ON DELETE CASCADE, NOT NULL |
| `workout_id` | `uuid` | FK → `workouts(id)` ON DELETE CASCADE, NOT NULL |
| `section_id` | `uuid` | FK → `bjj_sections(id)` ON DELETE CASCADE, NOT NULL |
| `roll_index` | `integer` | NOT NULL |
| `role` | `bjj_roll_role` | NOT NULL |
| `outcome` | `bjj_roll_outcome` | NOT NULL |
| `position_from` | `text` | NOT NULL |
| `position_to` | `text` | NULL allowed |
| `technique_ids` | `uuid[]` | default `'{}'` |
| `confidence` | `real` | CHECK (0..1) |
| `raw_excerpt` | `text` | NULL allowed |
| `status` | `bjj_roll_event_status` | NOT NULL default `'proposed'` |
| `source` | `bjj_roll_event_source` | NULL allowed |
| `created_at` | `timestamptz` | NOT NULL default `now()` |
| `updated_at` | `timestamptz` | NOT NULL default `now()` |

The 4 enums MUST be created in the same migration:
- `bjj_roll_role` = `('attacking', 'defending', 'neutral')`
- `bjj_roll_outcome` = `('submission', 'position_gain', 'position_loss', 'neutral')`
- `bjj_roll_event_status` = `('proposed', 'confirmed', 'rejected')`
- `bjj_roll_event_source` = `('ai_confirmed', 'ai_edited', 'manual')`

A unique constraint MUST exist on `(section_id, roll_index)` to prevent double-inserts on re-enhance.

#### Scenario: Migration creates the table and 4 enums

- GIVEN the migration `20260612000001_bjj_roll_events.sql` runs against a fresh database
- WHEN the migration completes
- THEN the `bjj_roll_events` table MUST exist with all 16 columns
- AND the 4 enum types MUST exist
- AND the unique constraint `(section_id, roll_index)` MUST be enforced

#### Scenario: Re-enhance replaces proposed rows via the unique constraint

- GIVEN `bjj_sections(id=S)` has 3 proposed rolls with `roll_index` 1, 2, 3
- WHEN the AI re-runs and proposes 2 new rolls with `roll_index` 1, 2
- AND the client upserts with `ON CONFLICT (section_id, roll_index) DO UPDATE`
- THEN the row at `roll_index = 3` MUST be removed (the client deletes `proposed` rows beyond the new max)
- AND rows at `roll_index = 1, 2` MUST be updated with the new payloads

---

### REQ-RE2: Indexes

The system MUST create 3 indexes in the same migration:

| Index | Columns | Purpose |
| --- | --- | --- |
| `bjj_roll_events_user_workout_idx` | `(user_id, workout_id)` | Per-workout reads |
| `bjj_roll_events_user_status_idx` | `(user_id, status)` | Aggregations filter by `status='confirmed'` |
| `bjj_roll_events_performed_lookup_idx` | `(user_id, section_id)` | Section-scoped lookups |

#### Scenario: Aggregations use the user_status index

- GIVEN a user has 1000 roll events (700 confirmed, 300 proposed)
- WHEN the dashboard queries `bjj_dashboard_role_balance` for that user
- THEN the planner MUST use `bjj_roll_events_user_status_idx` (verify in `EXPLAIN`)
- AND the response time MUST be < 200ms for the typical case

---

### REQ-RE3: Row-Level Security

RLS MUST be enabled on `bjj_roll_events` with 4 policies (SELECT, INSERT, UPDATE, DELETE). Each policy MUST follow the `bjj_section_techniques` 3-table join pattern:

```sql
create policy "Users can read own bjj_roll_events"
  on public.bjj_roll_events for select
  using (exists (
    select 1 from public.bjj_sections s
    join public.workouts w on w.id = s.workout_id
    where s.id = bjj_roll_events.section_id and w.user_id = auth.uid()
  ));
```

INSERT/UPDATE/DELETE policies MUST use the same `with check` shape. No coach read in MVP.

#### Scenario: User A cannot read User B's roll events

- GIVEN User A has 5 confirmed roll events
- AND User B has 3 confirmed roll events
- WHEN User A queries `bjj_roll_events` as User A
- THEN User A MUST see exactly 5 rows
- AND User A MUST NOT see User B's 3 rows

#### Scenario: User A cannot insert a roll for User B's section

- GIVEN a `bjj_sections` row owned by User B
- WHEN User A attempts to insert into `bjj_roll_events` with that `section_id`
- THEN the insert MUST be rejected by RLS (0 rows affected)

---

### REQ-RE4: SQL Aggregation Views

The system MUST create 3 views in `supabase/migrations/20260612000003_bjj_dashboard_views.sql`. Each view MUST filter to `r.status = 'confirmed'` AND `w.type = 'bjj'`:

| View | Aggregates |
| --- | --- |
| `bjj_dashboard_role_balance` | `(user_id, role) → count(*)` |
| `bjj_dashboard_outcomes` | `(user_id, outcome) → count(*)` |
| `bjj_dashboard_position_transitions` | `(user_id, position_from, position_to) → count(*)` (where `position_to IS NOT NULL`) |

#### Scenario: Views filter to confirmed rolls only

- GIVEN a user has 10 confirmed and 5 proposed roll events
- WHEN the dashboard queries `bjj_dashboard_role_balance`
- THEN the result MUST count only the 10 confirmed rows

#### Scenario: Views filter to BJJ workouts only

- GIVEN a user has 20 roll events on BJJ workouts and 5 on CrossFit workouts (orphaned; defensive)
- WHEN the dashboard queries `bjj_dashboard_outcomes`
- THEN the result MUST exclude the 5 CrossFit-related rows

#### Scenario: Position transitions excludes null position_to

- GIVEN a user has 12 confirmed roll events, of which 3 have `position_to = NULL`
- WHEN the dashboard queries `bjj_dashboard_position_transitions`
- THEN the result MUST aggregate only the 9 rows with `position_to IS NOT NULL`

---

### REQ-RE5: bjj_dashboard_data RPC

The system MUST create a SECURITY DEFINER RPC `bjj_dashboard_data(p_window text, p_start date default null, p_end date default null)` in `supabase/migrations/20260612000004_bjj_dashboard_rpc.sql`. The RPC MUST return `jsonb` matching the `BJJDashboardData` shape (PRD §6.11).

The RPC MUST:
- Compose the 3 views for `role_balance`, `outcomes`, `roll_flow`.
- Aggregate from `technique_practice_log` joined to `bjj_section_techniques` and `bjj_techniques` for `last_techniques` and `technique_types`.
- Resolve `p_window` to a date range: `7d` → 7 days back; `30d` → 30 days back; `90d` → 90 days back; `10r` → last 10 workouts with ≥1 confirmed roll.
- Look up `position_from` / `position_to` display labels from `bjj_positions` (RE-PV1).
- Use `auth.uid()` as the implicit user; do not accept a `p_user_id` parameter.

#### Scenario: RPC returns BJJDashboardData for 30d window

- GIVEN the user has data in the last 30 days
- WHEN the client calls `supabase.rpc('bjj_dashboard_data', { p_window: '30d' })`
- THEN the response MUST be a `BJJDashboardData` JSON object with all 13 top-level fields populated

#### Scenario: 10r window returns last 10 confirmed-roll workouts

- GIVEN a user has 25 BJJ workouts, of which 12 have ≥1 confirmed roll
- WHEN the RPC is called with `p_window: '10r'`
- THEN the response MUST aggregate from the 10 most recent of those 12 workouts (by `performed_at`)

#### Scenario: Proposed rolls are excluded from all aggregates

- GIVEN a user has 7 confirmed and 3 proposed roll events
- WHEN the RPC returns `role_balance`, `outcomes`, and `roll_flow`
- THEN the totals MUST reflect 7 events, not 10
- AND the proposed rows MUST NOT appear in any aggregation bucket

---

### REQ-RE6: bjj-section-ai Response Extension

The `bjj-section-ai` Edge Function response MUST add an optional `rolls[]` field. When the section's `goal` or `raw_description` indicates sparring (keyword heuristic: `sparring`, `rolls`, `rondas`, `libre`, `posicional`), the LLM MUST propose 0..N roll events. When the section is clearly technique drilling only, the LLM MUST emit `rolls: []`.

The existing `BJJSectionAIResponse` interface MUST grow:

```ts
interface BJJSectionAIResponse {
  ai_description: string
  matched_technique_ids: string[]
  rolls: Array<{
    roll_index: number       // 1-based, unique within the section
    role: 'attacking' | 'defending' | 'neutral'
    outcome: 'submission' | 'position_gain' | 'position_loss' | 'neutral'
    position_from: string    // MUST be a bjj_positions.key
    position_to: string | null
    technique_names: string[]  // free-text; mapped to bjj_techniques.id on persist
    confidence: number       // 0..1
    raw_excerpt: string      // the source sentence(s) that justified the roll
  }>
}
```

The `isValidAIResponse` guard MUST validate the new `rolls` field shape. The `buildMockResponse` fallback MUST emit `rolls: []` to keep the contract safe when the LLM is unavailable.

#### Scenario: Sparring section returns rolls

- GIVEN a section with `goal = 'Sparring 5 rounds'` and `raw_description = 'I rolled with Carlos. From closed guard I swept to mount. ...'`
- WHEN the function returns
- THEN `rolls.length` MUST be ≥ 1
- AND each `roll.position_from` MUST be a `bjj_positions.key`
- AND each `roll.confidence` MUST be in `[0, 1]`

#### Scenario: Technique-only section returns empty rolls

- GIVEN a section with `goal = 'Drill armbar from closed guard'` and no sparring keywords
- WHEN the function returns
- THEN `rolls` MUST be `[]`

#### Scenario: Mock fallback emits empty rolls

- GIVEN the LLM is unavailable and the mock fallback is used
- WHEN the function returns
- THEN `rolls` MUST be `[]` (the contract is safe even without LLM)

#### Scenario: raw_excerpt cites the source sentence

- GIVEN a roll is proposed with `position_from: 'closed_guard'` and `position_to: 'mount'`
- WHEN the response is reviewed
- THEN `raw_excerpt` MUST be a substring of the section's `raw_description` (or `section_goal`)
- AND it MUST contain the keywords that justify the roll

---

### REQ-RE7: Prompt Rules

The system prompt for `bjj-section-ai` MUST instruct the LLM to:
- Propose rolls only with evidence in `raw_description` (no fabrication).
- Prefer fewer high-confidence rolls over many guessed rolls.
- Map `position_from` / `position_to` to canonical `bjj_positions.key` values (no free-text position names).
- Map `technique_names` to `bjj_techniques.name` (English canonical); persist-time code resolves them to `bjj_techniques.id`.

#### Scenario: LLM proposes 2 rolls for a 5-round sparring description

- GIVEN a section with `raw_description` describing 5 rolls with at least 2 having clear position transitions
- WHEN the LLM returns
- THEN the LLM MUST propose 1..3 rolls (not 5)
- AND each proposed roll MUST have `confidence >= 0.5`

#### Scenario: Persist-time resolves technique_names to ids

- GIVEN the LLM returns `rolls[0].technique_names = ['Triangle Choke', 'Armbar']`
- WHEN the client upserts to `bjj_roll_events`
- THEN the `technique_ids` array MUST contain the `bjj_techniques.id` values for those names
- AND missing names MUST be silently dropped (no error; logged)

---

### REQ-RE8: RollReviewPanel Component

A new `RollReviewPanel` MUST be created at `src/features/bjj/dashboard/components/RollReviewPanel.tsx` (or `src/features/bjj/components/RollReviewPanel.tsx` per design decision). The panel MUST render inline inside `BJJSectionEditor` (consuming `AIPreview.rolls` from the existing AI preview state), below the existing `AIPreviewPanel`, when `rolls.length > 0`.

Per-row editable fields (PRD §6.8.3):

| Field | Control |
| --- | --- |
| Role | Select: `attacking` / `defending` / `neutral` |
| Outcome | Select: `submission` / `position_gain` / `position_loss` / `neutral` |
| `position_from` | Select from `bjj_positions` |
| `position_to` | Select from `bjj_positions` (optional) |
| Techniques | Multi-select from `bjj_techniques` |
| Delete row | Icon button |

Actions:

| Action | Behavior |
| --- | --- |
| `Confirm all` | Persist all rows with `status='confirmed'`, `source='ai_confirmed'` (no edits) |
| `Save edits` | Persist edited rows with `source='ai_edited'` |
| `Add roll manually` | Insert a blank row with `source='manual'` on next save |
| `Skip for now` | Discard proposals; section saves without roll events |
| `Don't ask again` | (Optional) Skip review for this section only (per-section preference) |

The `useConfirmRolls` mutation MUST upsert to `bjj_roll_events` on confirm; on success, it MUST call `invalidateQueries({ queryKey: ['bjj-dashboard'] })` so the dashboard refetches.

#### Scenario: Panel renders when AI proposes ≥1 roll

- GIVEN the AI enhance completes with `preview.rolls.length = 3`
- WHEN `BJJSectionEditor` re-renders
- THEN `<RollReviewPanel rolls={preview.rolls} />` MUST render below `<AIPreviewPanel />`

#### Scenario: Confirm all persists rows and invalidates the dashboard

- GIVEN the user clicks `Confirm all` on 3 proposed rolls
- WHEN `useConfirmRolls.mutate(rolls)` resolves
- THEN the 3 rows MUST be upserted to `bjj_roll_events` with `status='confirmed'`, `source='ai_confirmed'`
- AND `invalidateQueries(['bjj-dashboard'])` MUST be called
- AND the section save MUST proceed normally

#### Scenario: Save edits marks source as ai_edited

- GIVEN the user edits `rolls[0].outcome` from `position_gain` to `submission` and clicks `Save edits`
- WHEN the mutation resolves
- THEN the persisted row MUST have `source='ai_edited'`
- AND the change MUST be reflected on the dashboard on the next refetch

#### Scenario: Add roll manually inserts a blank row

- GIVEN the user clicks `Add roll manually` and fills role=`attacking`, position_from=`closed_guard`
- WHEN the user saves the section
- THEN a new `bjj_roll_events` row MUST be inserted with `source='manual'`, `confidence=null`

#### Scenario: Skip for now does not persist

- GIVEN the user clicks `Skip for now`
- WHEN the section save resolves
- THEN NO rows MUST be inserted into `bjj_roll_events`
- AND the dashboard banner on next visit MUST count this section as "without confirmed roll data"

#### Scenario: Re-enhance replaces only proposed rows

- GIVEN the user previously confirmed 2 rolls and the section has 1 proposed roll
- WHEN the user re-runs AI enhance and the LLM returns 2 new proposed rolls
- THEN on confirm, the 2 confirmed rows MUST remain untouched
- AND the 1 existing proposed row MUST be replaced (delete + insert, scoped to `status='proposed'`)

---

### REQ-RE9: Historical Backfill Migration

The system MUST create a backfill migration `20260612000005_bjj_roll_events_backfill.sql`. The migration MUST be idempotent: `INSERT ... ON CONFLICT DO NOTHING`.

The migration MUST insert `status='proposed'` roll rows for every existing `bjj_sections` row that:
- Belongs to a BJJ workout (`workouts.type = 'bjj'`).
- Has at least one of: `ai_description IS NOT NULL` OR `raw_description IS NOT NULL` matching the sparring keywords.
- Has zero `bjj_roll_events` rows already (so the migration is safe to re-run).

The migration MUST NOT auto-confirm any row.

#### Scenario: Migration proposes rows for sparring sections

- GIVEN a database with 50 BJJ sections, of which 12 are sparring sections without roll events
- WHEN the migration runs
- THEN 12 `proposed` roll rows MUST be inserted
- AND running the migration again MUST result in 0 new rows (idempotent)

#### Scenario: Banner shows count of unconfirmed sparring sections

- GIVEN a user with 5 sparring sections that have 0 confirmed rolls after backfill
- WHEN the user visits `/bjj/dashboard`
- THEN the page MUST render an informational banner reading "5 sparring sessions without confirmed roll data"
- AND the banner MUST link to a list of those 5 sessions

---

### REQ-RE10: BJJSectionEditor Integration

`BJJSectionEditor` (`src/features/bjj/components/BJJSectionEditor.tsx`) MUST be modified to:
- Extend the `AIPreview` interface (line ~13) to include `rolls: RollProposal[]`.
- Extend the AI enhance handler (line ~38) to store `result.rolls` alongside `result.ai_description` and `result.matched_technique_ids`.
- Render `<RollReviewPanel />` below `<AIPreviewPanel />` (around line 189–195) when `preview.rolls.length > 0`.
- The `useConfirmRolls` mutation persists rolls AFTER the section save resolves (roll persist is a separate step, not part of `bjj_create_workout` / `bjj_update_workout` RPCs).

The extension MUST NOT change the existing `AIPreviewPanel` Apply/Discard flow for `ai_description` + `matched_technique_ids`.

#### Scenario: AIPreview interface includes rolls

- GIVEN the new `AIPreview` interface
- WHEN the file is read
- THEN the interface MUST include a `rolls: RollProposal[]` field
- AND the existing `ai_description` and `matched_technique_ids` fields MUST be unchanged

#### Scenario: Section save completes before roll persist

- GIVEN the user has confirmed rolls in the `RollReviewPanel`
- WHEN the user clicks `Save section`
- THEN the section MUST be saved (via `bjj_create_workout` or `bjj_update_workout`) FIRST
- AND the rolls MUST be upserted to `bjj_roll_events` SECOND (after the section id is known)
- AND if the section save fails, NO roll rows MUST be inserted

---

## MODIFIED Requirements

None — this is a new capability.

---

## REMOVED Requirements

None.

---

## RENAMED Requirements

None.
