# Capability Proposal: bjj-position-vocabulary

> **Status**: Added (new domain — no existing `openspec/specs/bjj-position-vocabulary/spec.md` to delta against)
> **Change**: `bjj-evolution-dashboard`
> **Parent proposal**: `openspec/changes/bjj-evolution-dashboard/proposal.md`

## Why Added (not Modified)

The `bjj_positions` lookup table does not exist. Position `from`/`to` were previously free-text columns on `bjj_roll_events` per PRD §6.9 line 469–470. The proposal (Q2 decision) is to **create** the lookup table as the canonical vocabulary source. The lookup is shared infrastructure used by:

- The Roll Review form (selects for `position_from` / `position_to`).
- `RollFlowWidget` display labels (the `from` / `to` strings in `BJJDashboardData.roll_flow.edges[]`).
- The `bjj_dashboard_data` RPC for display label lookup.
- The `bjj-section-ai` prompt extension (instructs the LLM to use canonical keys).

The lookup also covers the `other` and any finish-node keys needed by the design (e.g. `submission_finish` if the AI needs a sentinel for finish positions). These are seeded in the same migration; the table is the canonical source of truth and grows without code changes.

A typed `getPositionLabel(key, locale)` helper in a shared module provides the read API. AI prompt extension requires `bjj_positions.key` values; rows with unknown keys are rejected at the API boundary (recommend: status `proposed` + `confidence = 0` + a `validation_error` flag, returned for human review — not silently dropped).

## What this capability owns

- The `bjj_positions` table schema: `(key text primary key, display_en text not null, display_es text not null, display_order int not null)`.
- Seed data: the 11 canonical keys from PRD §6.7 (`standing`, `closed_guard`, `open_guard`, `half_guard`, `side_control`, `mount`, `back_control`, `turtle`, `knee_on_belly`, `leg_entanglement`, `other`) plus any finish-node keys the design needs.
- The shared `getPositionLabel(key, locale)` typed helper at `src/features/bjj/position-vocabulary.ts` (or `utils/position-vocabulary.ts`).
- The `bjj-section-ai` prompt extension: AI must use `bjj_positions.key` for `position_from` / `position_to`; rows with unknown keys are flagged for review (not auto-rejected).
- Migration: `supabase/migrations/20260612000002_bjj_positions.sql` (table + seed + RLS read-true for all authenticated users).
- The lookup is **read-only** for athletes (no client writes); the canonical seed is the only data source.
