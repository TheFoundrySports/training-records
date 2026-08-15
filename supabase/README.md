# Supabase — migrations

This directory holds timestamped SQL migrations applied to the project's Supabase
project via the Supabase CLI. The naming convention is
`YYYYMMDDHHMMSS_<snake_case>.sql`.

## Verification on a fresh database

The fastest way to verify a new migration set end-to-end is to spin up the local
Supabase stack and reset the database. This applies every migration in
chronological order against a fresh Postgres instance, runs `supabase db lint`
after, and surfaces any DDL, RLS, or seed issues that the unit tests can't catch.

```bash
# Prereq: supabase CLI is pinned to v2.102.0 (see project README).
supabase start                       # boots local Postgres + GoTrue + PostgREST
supabase db reset                    # drops, re-applies all migrations, re-runs seed.sql
supabase db lint                     # static analysis on the resulting schema
```

`supabase db reset` will report any migration that fails to apply (syntax error,
type mismatch, RLS recursion, etc.) with a precise line number. The output is the
authoritative green/red signal for "migrations are correct" — Vitest's structural
tests only verify the migration files contain the right DDL shape; only Postgres
itself can confirm the DDL actually executes.

## PR 1 — `bjj-evolution-dashboard` (4 migrations)

Iteration 8 introduces the `bjj_roll_events` data domain. The 4 new migrations
land in this order:

| # | File | Purpose | Spec ref |
|---|------|---------|----------|
| 1 | `20260612000001_bjj_roll_events.sql` | `bjj_roll_events` table + 4 enums + 3 indexes + unique `(section_id, roll_index)` + 4 RLS policies + `updated_at` trigger | REQ-RE1, REQ-RE2, REQ-RE3 |
| 2 | `20260612000002_bjj_positions.sql` | `bjj_positions` lookup table + 11-row seed + RLS read-only for authenticated | REQ-PV1, REQ-PV2, REQ-PV8 |
| 3 | `20260612000003_bjj_dashboard_views.sql` | 3 SQL views: `bjj_dashboard_role_balance`, `bjj_dashboard_outcomes`, `bjj_dashboard_position_transitions` — all filter `r.status = 'confirmed' AND w.type = 'bjj'` | REQ-RE4 |
| 4 | `20260612000004_bjj_roll_events_backfill.sql` | One-time idempotent backfill that proposes `status = 'proposed'` placeholder rows for existing sparring sections | REQ-RE9 |

The `bjj_dashboard_data` SECURITY DEFINER RPC is deferred to PR 2 (Phase B)
alongside the Edge Function extension; PR 1 ships the views so the RPC can
compose from them in PR 2.

## Vitest structural tests

The unit tests under `src/__tests__/db/` assert the **shape** of each migration
file — table/column/enum/index/policy/seed presence, plus paren/quote balance
and a forward-reference guard. They run in milliseconds and are the cheap early
warning. The full SQL execution path is staging-only (see above).
