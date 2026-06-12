/**
 * RED tests for the 3 dashboard views migration
 * (`20260612000003_bjj_dashboard_views.sql`).
 *
 * Covers REQ-RE4:
 *   - 3 views exist: bjj_dashboard_role_balance, bjj_dashboard_outcomes,
 *     bjj_dashboard_position_transitions.
 *   - All 3 filter on r.status = 'confirmed' AND w.type = 'bjj'.
 *   - The position_transitions view skips rows where position_to IS NULL.
 *   - The views are re-runnable (CREATE OR REPLACE) and inherit access from
 *     the underlying bjj_roll_events RLS.
 *
 * Structural assertions on the migration file — same pattern as the table tests.
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

const MIGRATION_PATH = resolve(
  __dirname,
  '../../../supabase/migrations/20260612000003_bjj_dashboard_views.sql',
)

function readMigration(): string {
  if (!existsSync(MIGRATION_PATH)) {
    throw new Error(
      `Migration file missing at ${MIGRATION_PATH}. The RED test must fail before the GREEN migration is written.`,
    )
  }
  return readFileSync(MIGRATION_PATH, 'utf8')
}

describe('dashboard views migration — REQ-RE4 view definitions', () => {
  it.each([
    'bjj_dashboard_role_balance',
    'bjj_dashboard_outcomes',
    'bjj_dashboard_position_transitions',
  ])('declares the %s view as CREATE OR REPLACE VIEW', (view) => {
    const sql = readMigration()
    expect(sql).toMatch(
      new RegExp(`create\\s+or\\s+replace\\s+view\\s+public\\.${view}\\b`, 'i'),
    )
  })

  it('groups role_balance by (user_id, role) with count(*) as event_count', () => {
    const sql = readMigration()
    // Capture the body of the role_balance view; assert structure inside it.
    const match = sql.match(
      /create\s+or\s+replace\s+view\s+public\.bjj_dashboard_role_balance\s+as\s+([\s\S]+?);\s*create/i,
    )
    expect(match, 'role_balance view body not found').not.toBeNull()
    const body = match![1]
    expect(body).toMatch(/group\s+by\s+r\.user_id\s*,\s*r\.role/i)
    expect(body).toMatch(/count\(\*\)\s+as\s+event_count/i)
  })

  it('groups outcomes by (user_id, outcome) with count(*) as event_count', () => {
    const sql = readMigration()
    const match = sql.match(
      /create\s+or\s+replace\s+view\s+public\.bjj_dashboard_outcomes\s+as\s+([\s\S]+?);\s*create/i,
    )
    expect(match, 'outcomes view body not found').not.toBeNull()
    const body = match![1]
    expect(body).toMatch(/group\s+by\s+r\.user_id\s*,\s*r\.outcome/i)
    expect(body).toMatch(/count\(\*\)\s+as\s+event_count/i)
  })

  it('groups position_transitions by (user_id, position_from, position_to) with transition_count', () => {
    const sql = readMigration()
    const match = sql.match(
      /create\s+or\s+replace\s+view\s+public\.bjj_dashboard_position_transitions\s+as\s+([\s\S]+?);?\s*$/i,
    )
    expect(match, 'position_transitions view body not found').not.toBeNull()
    const body = match![1]
    expect(body).toMatch(
      /group\s+by\s+r\.user_id\s*,\s*r\.position_from\s*,\s*r\.position_to/i,
    )
    expect(body).toMatch(/count\(\*\)\s+as\s+transition_count/i)
  })
})

describe('dashboard views migration — REQ-RE4 filter clauses', () => {
  it('all 3 views filter to r.status = \'confirmed\' AND w.type = \'bjj\'', () => {
    const sql = readMigration()

    // Each view must contain the dual filter in its WHERE clause.
    const viewNames = [
      'bjj_dashboard_role_balance',
      'bjj_dashboard_outcomes',
      'bjj_dashboard_position_transitions',
    ]
    for (const view of viewNames) {
      const match = sql.match(
        new RegExp(
          `create\\s+or\\s+replace\\s+view\\s+public\\.${view}\\s+as\\s+([\\s\\S]+?)(?:;\\s*create|;\\s*$)`,
          'i',
        ),
      )
      expect(match, `${view} view body not found`).not.toBeNull()
      const body = match![1]
      expect(
        body,
        `${view} must filter on r.status = 'confirmed'`,
      ).toMatch(/r\.status\s*=\s*'confirmed'/i)
      expect(
        body,
        `${view} must filter on w.type = 'bjj'`,
      ).toMatch(/w\.type\s*=\s*'bjj'/i)
    }
  })

  it('position_transitions excludes rows where position_to IS NULL', () => {
    const sql = readMigration()
    const match = sql.match(
      /create\s+or\s+replace\s+view\s+public\.bjj_dashboard_position_transitions\s+as\s+([\s\S]+?);?\s*$/i,
    )
    expect(match).not.toBeNull()
    const body = match![1]
    expect(body).toMatch(/r\.position_to\s+is\s+not\s+null/i)
  })
})

describe('dashboard views migration — source tables', () => {
  it('all 3 views read from bjj_roll_events joined to workouts', () => {
    const sql = readMigration()
    const viewNames = [
      'bjj_dashboard_role_balance',
      'bjj_dashboard_outcomes',
      'bjj_dashboard_position_transitions',
    ]
    for (const view of viewNames) {
      const match = sql.match(
        new RegExp(
          `create\\s+or\\s+replace\\s+view\\s+public\\.${view}\\s+as\\s+([\\s\\S]+?)(?:;\\s*create|;\\s*$)`,
          'i',
        ),
      )
      expect(match, `${view} body not found`).not.toBeNull()
      const body = match![1]
      expect(body, `${view} must read from bjj_roll_events`).toMatch(
        /from\s+public\.bjj_roll_events\s+r/i,
      )
      expect(body, `${view} must join workouts`).toMatch(
        /join\s+public\.workouts\s+w\s+on\s+w\.id\s*=\s*r\.workout_id/i,
      )
    }
  })
})
