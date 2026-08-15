# Capability Proposal: bjj-roll-events

> **Status**: Added (new domain — no existing `openspec/specs/bjj-roll-events/spec.md` to delta against)
> **Change**: `bjj-evolution-dashboard`
> **Parent proposal**: `openspec/changes/bjj-evolution-dashboard/proposal.md`

## Why Added (not Modified)

`bjj_roll_events` is a **brand new domain** — the table does not exist, the 4 enums (`bjj_roll_role`, `bjj_roll_outcome`, `bjj_roll_event_status`, `bjj_roll_event_source`) do not exist, the 3 SQL views do not exist, and the `bjj_dashboard_data` RPC does not exist. Therefore the capability is `Added`.

The `bjj-section-ai` Edge Function is **extended** (its `BJJSectionAIResponse` grows a `rolls[]` field). The same is true of `BJJSectionEditor` (its `AIPreview` interface grows a `rolls` field; it now hosts `RollReviewPanel` inline). Both extensions are **captured inside this `bjj-roll-events` spec** because they are sub-deliverables of the hybrid roll-capture flow (PRD §6.8), not independent capabilities. They are not split into a separate `bjj-section-ai-rolls` or `bjj-section-editor-rolls` capability to keep the spec surface reviewable under the 400-line budget.

## What this capability owns

- The `bjj_roll_events` table schema, the 4 enums, the 3 indexes, the unique `(section_id, roll_index)` constraint (PRD §6.9).
- RLS policies mirroring `bjj_section_techniques` 3-table join (rolls → section → workout → `auth.uid()`).
- The 3 SQL views (`bjj_dashboard_role_balance`, `bjj_dashboard_outcomes`, `bjj_dashboard_position_transitions`).
- The `bjj_dashboard_data(p_window text, p_start date, p_end date)` RPC returning `BJJDashboardData` and composing the 3 views + technique aggregates.
- The extension of `BJJSectionAIResponse` with `rolls[]` per PRD §6.8.2 — schema, prompt rules, confidence semantics, raw_excerpt semantics, mock fallback update.
- `RollReviewPanel` — the inline review component in `BJJSectionEditor` with confirm-all / save-edits / add-roll / delete / skip actions; re-enhance replaces `proposed` only.
- `useConfirmRolls()` mutation and the `useConfirmRolls.onSuccess → invalidateQueries(['bjj-dashboard'])` invalidation.
- The idempotent backfill migration that proposes `status='proposed'` rolls for existing sparring sections (`ON CONFLICT DO NOTHING`).
- The informational banner on dashboard: "X sparring sessions without confirmed roll data" (US-49).
- Server-side guard: the RPC must reject aggregates against `status='proposed'` rows. A specific edge case: `proposed` rows in the user's history MUST NOT appear in any aggregate; the dashboard shows the banner instead.
