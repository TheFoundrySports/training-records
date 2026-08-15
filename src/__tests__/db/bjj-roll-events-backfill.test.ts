/**
 * RED tests for the backfill migration
 * (`20260612000004_bjj_roll_events_backfill.sql`).
 *
 * Covers REQ-RE9:
 *   - Idempotent (ON CONFLICT (section_id, roll_index) DO NOTHING).
 *   - Targets BJJ sections whose goal / raw_description / ai_description
 *     matches the sparring keyword set.
 *   - Skips sections that already have any roll event (no double-insert).
 *   - Inserts one placeholder row per matching section with
 *     status='proposed', source='manual', role/outcome='neutral',
 *     position_from='other', position_to=null, technique_ids='{}',
 *     confidence=0, raw_excerpt = first 200 chars of raw_description.
 *   - Non-sparring BJJ sections and non-BJJ workouts are left untouched.
 *
 * Structural assertions on the migration file — same pattern as the
 * other migration tests.
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

const MIGRATION_PATH = resolve(
  __dirname,
  '../../../supabase/migrations/20260612000004_bjj_roll_events_backfill.sql',
)

function readMigration(): string {
  if (!existsSync(MIGRATION_PATH)) {
    throw new Error(
      `Migration file missing at ${MIGRATION_PATH}. The RED test must fail before the GREEN migration is written.`,
    )
  }
  return readFileSync(MIGRATION_PATH, 'utf8')
}

describe('backfill migration — REQ-RE9 idempotency', () => {
  it('inserts into bjj_roll_events with ON CONFLICT (section_id, roll_index) DO NOTHING', () => {
    const sql = readMigration()
    expect(sql).toMatch(
      /insert\s+into\s+public\.bjj_roll_events\b[\s\S]+on\s+conflict\s*\(\s*section_id\s*,\s*roll_index\s*\)\s+do\s+nothing/i,
    )
  })
})

describe('backfill migration — REQ-RE9 target selection', () => {
  it('joins bjj_sections to workouts and filters to w.type = \'bjj\'', () => {
    const sql = readMigration()
    expect(sql).toMatch(/from\s+public\.bjj_sections\s+s/i)
    expect(sql).toMatch(/join\s+public\.workouts\s+w\s+on\s+w\.id\s*=\s*s\.workout_id/i)
    expect(sql).toMatch(/w\.type\s*=\s*'bjj'/i)
  })

  it('matches the locked sparring keyword set (case-insensitive) on goal / raw_description / ai_description', () => {
    const sql = readMigration()
    // The full keyword group from the design.
    const keywordGroup = 'sparring|rolls|rondas|libre|posicional'
    // Each of the three text columns must independently ~* the keyword group.
    expect(sql).toMatch(new RegExp(`s\\.goal\\s+~\\*\\s*'${keywordGroup}'`, 'i'))
    expect(sql).toMatch(new RegExp(`s\\.raw_description\\s+~\\*\\s*'${keywordGroup}'`, 'i'))
    expect(sql).toMatch(new RegExp(`s\\.ai_description\\s+~\\*\\s*'${keywordGroup}'`, 'i'))
  })

  it('skips sections that already have any bjj_roll_events row (NOT EXISTS guard)', () => {
    const sql = readMigration()
    expect(sql).toMatch(
      /not\s+exists\s*\(\s*select\s+1\s+from\s+public\.bjj_roll_events\s+re\s+where\s+re\.section_id\s*=\s*s\.id\s*\)/i,
    )
  })
})

describe('backfill migration — REQ-RE9 placeholder row shape', () => {
  it('inserts one row per matching section with roll_index = 1', () => {
    const sql = readMigration()
    // Confirm roll_index literal '1' is in the SELECT list, scoped to the per-section select.
    expect(sql).toMatch(/\broll_index\b[\s\S]{0,80}\b1\b/i)
  })

  it('uses the locked placeholder values: role/outcome neutral, position_from other, position_to null', () => {
    const sql = readMigration()
    expect(sql).toMatch(
      /'neutral'::public\.bjj_roll_role|'neutral'\s+as\s+role\s+public\.bjj_roll_role/i,
    )
    expect(sql).toMatch(
      /'neutral'::public\.bjj_roll_outcome|'neutral'\s+as\s+outcome\s+public\.bjj_roll_outcome/i,
    )
    expect(sql).toMatch(/'other'\s+as\s+position_from|'other'::text\s+as\s+position_from/i)
    expect(sql).toMatch(/null\s+as\s+position_to/i)
  })

  it('marks the row as proposed + manual with confidence = 0 and an empty technique_ids array', () => {
    const sql = readMigration()
    expect(sql).toMatch(
      /'proposed'::public\.bjj_roll_event_status|'proposed'\s+as\s+status\s+public\.bjj_roll_event_status/i,
    )
    expect(sql).toMatch(
      /'manual'::public\.bjj_roll_event_source|'manual'\s+as\s+source\s+public\.bjj_roll_event_source/i,
    )
    // confidence 0 (numeric literal) — the brief locks this value, not null.
    expect(sql).toMatch(/\bconfidence\b[\s\S]{0,40}\b0\b/i)
    expect(sql).toMatch(/'\{\}'\s+as\s+technique_ids|"\{\}"\s+as\s+technique_ids/i)
  })

  it('captures the first 200 chars of raw_description as raw_excerpt', () => {
    const sql = readMigration()
    // left(raw_description, 200) — the locked form for the raw_excerpt.
    expect(sql).toMatch(/left\s*\(\s*s\.raw_description\s*,\s*200\s*\)\s+as\s+raw_excerpt/i)
  })
})

describe('backfill migration — scope guards', () => {
  it('does NOT touch non-sparring BJJ sections (only matches when keyword regex matches)', () => {
    const sql = readMigration()
    // The WHERE clause must include a positive keyword match (not just IS NOT NULL)
    // on at least one of goal / raw_description / ai_description.
    const hasKeywordMatch =
      /s\.goal\s+~\*/i.test(sql) ||
      /s\.raw_description\s+~\*/i.test(sql) ||
      /s\.ai_description\s+~\*/i.test(sql)
    expect(hasKeywordMatch, 'backfill must require a sparring-keyword match').toBe(true)
  })

  it('does NOT touch non-BJJ workouts (w.type = \'bjj\' guard)', () => {
    const sql = readMigration()
    expect(sql).toMatch(/w\.type\s*=\s*'bjj'/i)
  })
})
