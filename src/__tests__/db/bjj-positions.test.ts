/**
 * RED tests for `bjj_positions` migration (`20260612000002_bjj_positions.sql`).
 *
 * Covers REQ-PV1 (table schema), REQ-PV2 (seed data with 11 keys), REQ-PV8 (RLS read-only).
 *
 * Structural assertions on the migration file — same pattern as the roll events tests.
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

const MIGRATION_PATH = resolve(
  __dirname,
  '../../../supabase/migrations/20260612000002_bjj_positions.sql',
)

const EXPECTED_KEYS: ReadonlyArray<{
  key: string
  display_en: string
  display_es: string
  order: number
}> = [
  { key: 'standing', display_en: 'Standing', display_es: 'De pie', order: 1 },
  { key: 'closed_guard', display_en: 'Closed guard', display_es: 'Guardia cerrada', order: 2 },
  { key: 'open_guard', display_en: 'Open guard', display_es: 'Guardia abierta', order: 3 },
  { key: 'half_guard', display_en: 'Half guard', display_es: 'Media guardia', order: 4 },
  { key: 'side_control', display_en: 'Side control', display_es: 'Control lateral', order: 5 },
  { key: 'mount', display_en: 'Mount', display_es: 'Montada', order: 6 },
  { key: 'back_control', display_en: 'Back control', display_es: 'Control de espalda', order: 7 },
  { key: 'turtle', display_en: 'Turtle', display_es: 'Tortuga', order: 8 },
  { key: 'knee_on_belly', display_en: 'Knee on belly', display_es: 'Rodilla en el estómago', order: 9 },
  { key: 'leg_entanglement', display_en: 'Leg entanglement', display_es: 'Enredo de piernas', order: 10 },
  { key: 'other', display_en: 'Other', display_es: 'Otro', order: 11 },
]

function readMigration(): string {
  if (!existsSync(MIGRATION_PATH)) {
    throw new Error(
      `Migration file missing at ${MIGRATION_PATH}. The RED test must fail before the GREEN migration is written.`,
    )
  }
  return readFileSync(MIGRATION_PATH, 'utf8')
}

describe('bjj_positions migration — REQ-PV1 table schema', () => {
  it('creates the table with 4 columns from REQ-PV1', () => {
    const sql = readMigration()
    expect(sql).toMatch(
      /create\s+table(?:\s+if\s+not\s+exists)?\s+public\.bjj_positions\s*\(/i,
    )
    expect(sql).toMatch(/\bkey\b\s+text\s+primary\s+key/i)
    expect(sql).toMatch(/\bdisplay_en\b\s+text\s+not\s+null/i)
    expect(sql).toMatch(/\bdisplay_es\b\s+text\s+not\s+null/i)
    expect(sql).toMatch(/\bdisplay_order\b\s+int(eger)?\s+not\s+null/i)
  })

  it('is idempotent on re-run (CREATE TABLE IF NOT EXISTS)', () => {
    const sql = readMigration()
    expect(sql).toMatch(/create\s+table\s+if\s+not\s+exists\s+public\.bjj_positions/i)
  })
})

describe('bjj_positions migration — REQ-PV2 seed data', () => {
  it('seeds exactly 11 rows using INSERT … VALUES … ON CONFLICT DO NOTHING', () => {
    const sql = readMigration()
    expect(sql).toMatch(
      /insert\s+into\s+public\.bjj_positions\s*\(\s*key\s*,\s*display_en\s*,\s*display_es\s*,\s*display_order\s*\)\s+values/i,
    )
    expect(sql).toMatch(/on\s+conflict\s*\(\s*key\s*\)\s+do\s+nothing/i)

    // Every expected key, with bilingual labels and matching display_order, must appear in a VALUES tuple.
    for (const row of EXPECTED_KEYS) {
      const pattern = new RegExp(
        `\\(\\s*'${row.key}'\\s*,\\s*'${row.display_en.replace(/'/g, "\\'")}'\\s*,\\s*'${row.display_es.replace(/'/g, "\\'")}'\\s*,\\s*${row.order}\\s*\\)`,
      )
      expect(
        sql,
        `bjj_positions seed must include (${row.key}, ${row.display_en}, ${row.display_es}, ${row.order})`,
      ).toMatch(pattern)
    }

    // No additional seed rows beyond the 11 canonical keys (count the value tuples).
    const tupleCount = (sql.match(/\(\s*'[a-z_]+'\s*,\s*'[^']+'\s*,\s*'[^']+'\s*,\s*\d+\s*\)/g) || []).length
    expect(
      tupleCount,
      `bjj_positions seed must contain exactly 11 rows (got ${tupleCount})`,
    ).toBe(EXPECTED_KEYS.length)
  })
})

describe('bjj_positions migration — REQ-PV8 RLS', () => {
  it('enables RLS and grants SELECT only to authenticated users', () => {
    const sql = readMigration()
    expect(sql).toMatch(
      /alter\s+table\s+public\.bjj_positions\s+enable\s+row\s+level\s+security/i,
    )
    // A single SELECT policy keyed on auth.role() = 'authenticated'.
    const policies = sql.match(
      /create\s+policy\s+"[^"]+"\s+on\s+public\.bjj_positions\s+for\s+select[^;]+/gi,
    )
    expect(policies, 'expected at least one SELECT policy on bjj_positions').not.toBeNull()
    expect(policies!.length).toBe(1)
    expect(policies![0]).toMatch(/auth\.role\(\)\s*=\s*'authenticated'/i)
  })
})
