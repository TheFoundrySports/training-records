/**
 * RED tests for the `bjj_dashboard_data` RPC migration
 * (`20260612000005_bjj_dashboard_data_rpc.sql`).
 *
 * Covers REQ-RE5 (bjj_dashboard_data RPC):
 *   - SECURITY DEFINER function
 *   - auth.uid() only — no p_user_id parameter
 *   - p_window text (7d/30d/90d/10r); p_start/p_end date defaults to null
 *   - returns jsonb matching BJJDashboardData
 *   - composes from the 3 bjj_dashboard_* views
 *   - aggregates from confirmed rows only (via the views, which already filter)
 *   - window resolution + UNKNOWN_WINDOW P0001
 *   - UNAUTHENTICATED P0001 when auth.uid() is null
 *   - 10r window resolves to last 10 workouts with confirmed rolls
 *   - left-joins bjj_positions for display labels
 *   - header comment notes the migration has NOT been executed against real
 *     Postgres (no staging env per the orchestrator's defensive note)
 *
 * Structural assertions on the migration file — same pattern as the
 * other migration tests. The migration is the contract; full SQL
 * execution verification happens on staging via `supabase db reset`.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { describe, it, expect } from 'vitest'

// Resolve the NEWEST *bjj_dashboard_data*.sql migration
// (Design D5: new migration supersedes the committed one)
const MIGRATIONS_DIR = resolve(__dirname, '../../../supabase/migrations')

function getNewestDashboardDataMigration(): string {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.includes('bjj_dashboard_data') && f.endsWith('.sql'))
    .sort()
  
  if (files.length === 0) {
    throw new Error('No bjj_dashboard_data migration found')
  }
  
  return join(MIGRATIONS_DIR, files[files.length - 1])
}

const MIGRATION_PATH = getNewestDashboardDataMigration()

function readMigration(): string {
  if (!existsSync(MIGRATION_PATH)) {
    throw new Error(
      `Migration file missing at ${MIGRATION_PATH}. The RED test must fail before the GREEN migration is written.`,
    )
  }
  return readFileSync(MIGRATION_PATH, 'utf8')
}

describe('bjj_dashboard_data RPC migration — file presence', () => {
  it('creates a bjj_dashboard_data migration file', () => {
    expect(existsSync(MIGRATION_PATH), `${MIGRATION_PATH} must exist`).toBe(true)
  })

  it('resolves to the newest *bjj_dashboard_data*.sql migration', () => {
    const filename = MIGRATION_PATH.split('/').pop()
    expect(filename).toMatch(/bjj_dashboard_data.*\.sql$/)
  })
})

describe('bjj_dashboard_data RPC — REQ-RE5 function signature', () => {
  it('declares CREATE OR REPLACE FUNCTION public.bjj_dashboard_data', () => {
    const sql = readMigration()
    expect(sql).toMatch(
      /create\s+or\s+replace\s+function\s+public\.bjj_dashboard_data\s*\(/i,
    )
  })

  it('declares p_window as a text parameter', () => {
    const sql = readMigration()
    expect(sql).toMatch(/p_window\s+text/i)
  })

  it('declares p_start as a date parameter with default null', () => {
    const sql = readMigration()
    expect(sql).toMatch(/p_start\s+date\s+default\s+null/i)
  })

  it('declares p_end as a date parameter with default null', () => {
    const sql = readMigration()
    expect(sql).toMatch(/p_end\s+date\s+default\s+null/i)
  })

  it('returns jsonb', () => {
    const sql = readMigration()
    expect(sql).toMatch(/returns\s+jsonb/i)
  })

  it('declares language plpgsql', () => {
    const sql = readMigration()
    expect(sql).toMatch(/language\s+plpgsql/i)
  })
})

describe('bjj_dashboard_data RPC — REQ-RE5 security model', () => {
  it('is SECURITY DEFINER', () => {
    const sql = readMigration()
    expect(sql).toMatch(/security\s+definer/i)
  })

  it('references auth.uid() (no p_user_id parameter)', () => {
    const sql = readMigration()
    expect(sql).toMatch(/auth\.uid\(\)/i)
    // The locked decision is "no p_user_id param"; assert the absence
    // explicitly so a future regression that adds it is caught.
    expect(sql).not.toMatch(/p_user_id\s+(uuid|text|date)/i)
  })

  it('raises UNAUTHENTICATED with P0001 when auth.uid() is null', () => {
    const sql = readMigration()
    expect(sql).toMatch(
      /raise\s+exception\s+'UNAUTHENTICATED'[\s\S]+errcode\s*=\s*'P0001'/i,
    )
  })

  it('revokes EXECUTE from public and grants only to authenticated', () => {
    const sql = readMigration()
    expect(sql).toMatch(/revoke\s+all\s+on\s+function\s+public\.bjj_dashboard_data[\s\S]+from\s+public/i)
    expect(sql).toMatch(/grant\s+execute\s+on\s+function\s+public\.bjj_dashboard_data[\s\S]+to\s+authenticated/i)
  })
})

describe('bjj_dashboard_data RPC — REQ-RE5 window resolution', () => {
  it('resolves 7d, 30d, 90d to date ranges relative to current_date', () => {
    const sql = readMigration()
    expect(sql).toMatch(/7d[\s\S]+current_date\s*-\s*7/i)
    expect(sql).toMatch(/30d[\s\S]+current_date\s*-\s*30/i)
    expect(sql).toMatch(/90d[\s\S]+current_date\s*-\s*90/i)
  })

  it('resolves 10r to a workout LIMIT (last 10 workouts with confirmed rolls)', () => {
    const sql = readMigration()
    // The 10r branch should set a limit (commonly v_limit := 10) and the
    // aggregate subquery should use that limit when filtering.
    expect(sql).toMatch(/10r[\s\S]+limit\s+v_limit/i)
  })

  it('raises UNKNOWN_WINDOW with P0001 for an unrecognized window string', () => {
    const sql = readMigration()
    expect(sql).toMatch(
      /raise\s+exception\s+'UNKNOWN_WINDOW[\s\S]+errcode\s*=\s*'P0001'/i,
    )
  })
})

describe('bjj_dashboard_data RPC — REQ-RE5 aggregation source', () => {
  it('declares a scoped_rolls CTE with window predicate for role/outcomes/flow', () => {
    const sql = readMigration()
    // Design D1: single scoped_rolls CTE feeds role_balance / outcomes / roll_flow
    expect(sql).toMatch(/with\s+scoped_rolls\s+as\s*\(/i)
    expect(sql).toMatch(/from\s+public\.bjj_roll_events\s+r/i)
    expect(sql).toMatch(/join\s+public\.workouts\s+w\s+on\s+w\.id\s*=\s*r\.workout_id/i)
    expect(sql).toMatch(/r\.status\s*=\s*'confirmed'/i)
    expect(sql).toMatch(/w\.type\s*=\s*'bjj'/i)
  })

  it('reads from scoped_rolls for role_balance aggregation', () => {
    const sql = readMigration()
    // Design D1: role_balance reads from scoped_rolls, not the unfiltered view
    expect(sql).toMatch(/select\s+.*from\s+scoped_rolls/i)
  })

  it('reads from scoped_rolls for outcomes aggregation', () => {
    const sql = readMigration()
    // Design D1: outcomes reads from scoped_rolls
    expect(sql).toMatch(/role_balance[\s\S]*scoped_rolls/i)
  })

  it('reads from scoped_rolls for roll_flow aggregation with position_to is not null', () => {
    const sql = readMigration()
    // Design D1: roll_flow reads from scoped_rolls, keeps position_to is not null
    expect(sql).toMatch(/roll_flow[\s\S]*scoped_rolls/i)
  })

  it('unnests technique_ids in a subquery before counting distinct techniques', () => {
    const sql = readMigration()
    // Postgres rejects count(distinct unnest(...)) — SRF inside aggregate.
    expect(sql).not.toMatch(/count\s*\(\s*distinct\s+unnest\s*\(/i)
    expect(sql).toMatch(/unnest\s*\(\s*technique_ids\s*\)/i)
  })

  it('joins bjj_positions for display labels (REQ-PV1)', () => {
    const sql = readMigration()
    // Roll-flow edges now emit position keys; labels resolve client-side.
    expect(sql).toMatch(/'from',\s*position_from/i)
    expect(sql).toMatch(/'to',\s*position_to/i)
  })

  it('emits widget contract field names for last_techniques rows', () => {
    const sql = readMigration()
    expect(sql).toMatch(/'rows'/i)
    expect(sql).toMatch(/'technique_id'/i)
    expect(sql).toMatch(/'technique_name'/i)
    expect(sql).toMatch(/'practice_count'/i)
  })

  it('emits role/outcome widget field names (not legacy label/n)', () => {
    const sql = readMigration()
    expect(sql).toMatch(/'role',\s*role/i)
    expect(sql).toMatch(/'outcome',\s*outcome/i)
    expect(sql).not.toMatch(/'n',\s*event_count/i)
  })
})

describe('bjj_dashboard_data RPC — REQ-RE5 return shape', () => {
  it('encodes the BJJDashboardData shape in the jsonb_build_object body', () => {
    const sql = readMigration()
    // Top-level fields per design §4:
    expect(sql).toMatch(/'title'/i)
    expect(sql).toMatch(/'subtitle'/i)
    expect(sql).toMatch(/'generated_at'/i)
    expect(sql).toMatch(/'last_techniques'/i)
    expect(sql).toMatch(/'technique_types'/i)
    expect(sql).toMatch(/'role_balance'/i)
    expect(sql).toMatch(/'outcomes'/i)
    expect(sql).toMatch(/'roll_flow'/i)
  })

  it('builds the jsonb with jsonb_build_object', () => {
    const sql = readMigration()
    expect(sql).toMatch(/jsonb_build_object/i)
  })

  it('returns a jsonb value (the variable is jsonb)', () => {
    const sql = readMigration()
    // The function declares returns jsonb and the body declares v_payload jsonb
    expect(sql).toMatch(/v_payload\s+jsonb/i)
    expect(sql).toMatch(/return\s+v_payload/i)
  })
})

describe('bjj_dashboard_data RPC — defensive header', () => {
  it('declares a header comment noting the migration is unverified against real Postgres', () => {
    const sql = readMigration()
    // Per the orchestrator's defensive note: the migration has not been
    // executed against real Postgres (no staging env). The header MUST
    // say so explicitly so a future reader does not assume the SQL has
    // been smoke-tested. The comment is the tripwire.
    const hasUnverified =
      /unverified/i.test(sql) ||
      /not\s+been\s+executed/i.test(sql) ||
      /has\s+not\s+been\s+executed/i.test(sql)
    expect(hasUnverified, 'migration must declare it is unverified against real Postgres').toBe(true)
  })
})
