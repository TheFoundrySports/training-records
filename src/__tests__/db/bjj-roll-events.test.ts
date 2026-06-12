/**
 * RED tests for `bjj_roll_events` migration (`20260612000001_bjj_roll_events.sql`).
 *
 * Covers REQ-RE1 (table schema), REQ-RE2 (indexes), REQ-RE3 (RLS).
 *
 * These are structural assertions on the migration file content. The migration is
 * the contract; the SQL it produces is what runs on staging. A failing assertion
 * here means the migration is missing a required schema element. Full SQL execution
 * verification happens on staging via `supabase db reset` (see `supabase/README.md`).
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

const MIGRATION_PATH = resolve(
  __dirname,
  '../../../supabase/migrations/20260612000001_bjj_roll_events.sql',
)

function readMigration(): string {
  if (!existsSync(MIGRATION_PATH)) {
    throw new Error(
      `Migration file missing at ${MIGRATION_PATH}. The RED test must fail before the GREEN migration is written.`,
    )
  }
  return readFileSync(MIGRATION_PATH, 'utf8')
}

describe('bjj_roll_events migration — REQ-RE1 table schema', () => {
  it('declares the 4 enums with the locked values', () => {
    const sql = readMigration()
    expect(sql).toMatch(
      /create type\s+public\.bjj_roll_role\s+as enum\s*\(\s*'attacking'\s*,\s*'defending'\s*,\s*'neutral'\s*\)/,
    )
    expect(sql).toMatch(
      /create type\s+public\.bjj_roll_outcome\s+as enum\s*\(\s*'submission'\s*,\s*'position_gain'\s*,\s*'position_loss'\s*,\s*'neutral'\s*\)/,
    )
    expect(sql).toMatch(
      /create type\s+public\.bjj_roll_event_status\s+as enum\s*\(\s*'proposed'\s*,\s*'confirmed'\s*,\s*'rejected'\s*\)/,
    )
    expect(sql).toMatch(
      /create type\s+public\.bjj_roll_event_source\s+as enum\s*\(\s*'ai_confirmed'\s*,\s*'ai_edited'\s*,\s*'manual'\s*\)/,
    )
  })

  it('creates the bjj_roll_events table with all 16 columns from REQ-RE1', () => {
    const sql = readMigration()
    expect(sql).toMatch(/create table\s+public\.bjj_roll_events\s*\(/)

    const requiredColumns = [
      'id',
      'user_id',
      'workout_id',
      'section_id',
      'roll_index',
      'role',
      'outcome',
      'position_from',
      'position_to',
      'technique_ids',
      'confidence',
      'raw_excerpt',
      'status',
      'source',
      'created_at',
      'updated_at',
    ]
    for (const col of requiredColumns) {
      expect(
        sql,
        `bjj_roll_events must declare a "${col}" column (REQ-RE1)`,
      ).toMatch(new RegExp(`\\b${col}\\b`, 'i'))
    }
  })

  it('enforces the confidence check constraint (0..1) from REQ-RE1', () => {
    const sql = readMigration()
    expect(sql).toMatch(
      /check\s*\(\s*confidence\s+is\s+null\s+or\s*\(\s*confidence\s*>=\s*0\s+and\s+confidence\s*<=\s*1\s*\)\s*\)/i,
    )
  })

  it('enforces a unique constraint on (section_id, roll_index)', () => {
    const sql = readMigration()
    expect(sql).toMatch(
      /constraint\s+\S*bjj_roll_events_section_index_unique\s+unique\s*\(\s*section_id\s*,\s*roll_index\s*\)/i,
    )
  })

  it('FKs reference auth.users, public.workouts, and public.bjj_sections with ON DELETE CASCADE', () => {
    const sql = readMigration()
    expect(sql).toMatch(
      /references\s+auth\.users\(id\)\s+on\s+delete\s+cascade/i,
    )
    expect(sql).toMatch(
      /references\s+public\.workouts\(id\)\s+on\s+delete\s+cascade/i,
    )
    expect(sql).toMatch(
      /references\s+public\.bjj_sections\(id\)\s+on\s+delete\s+cascade/i,
    )
  })

  it('status defaults to proposed and uses the bjj_roll_event_status enum', () => {
    const sql = readMigration()
    expect(sql).toMatch(
      /status\s+public\.bjj_roll_event_status\s+not\s+null\s+default\s+'proposed'/i,
    )
  })
})

describe('bjj_roll_events migration — REQ-RE2 indexes', () => {
  it('creates the 3 required indexes for aggregation patterns', () => {
    const sql = readMigration()
    expect(sql).toMatch(
      /create\s+index\s+\S*bjj_roll_events_user_workout_idx\s+on\s+public\.bjj_roll_events\s*\(\s*user_id\s*,\s*workout_id\s*\)/i,
    )
    expect(sql).toMatch(
      /create\s+index\s+\S*bjj_roll_events_user_status_idx\s+on\s+public\.bjj_roll_events\s*\(\s*user_id\s*,\s*status\s*\)/i,
    )
    expect(sql).toMatch(
      /create\s+index\s+\S*bjj_roll_events_performed_lookup_idx\s+on\s+public\.bjj_roll_events\s*\(\s*user_id\s*,\s*section_id\s*\)/i,
    )
  })
})

describe('bjj_roll_events migration — REQ-RE3 RLS', () => {
  it('enables RLS on the table', () => {
    const sql = readMigration()
    expect(sql).toMatch(
      /alter\s+table\s+public\.bjj_roll_events\s+enable\s+row\s+level\s+security/i,
    )
  })

  it('defines 4 policies: select, insert, update, delete — all owner-scoped', () => {
    const sql = readMigration()

    // 4 policies, all owner-scoped via the bjj_sections → workouts → auth.uid() chain.
    const policyHeaders = sql.match(
      /create\s+policy\s+"[^"]+"\s+on\s+public\.bjj_roll_events\s+for\s+(select|insert|update|delete)/gi,
    )
    expect(policyHeaders, 'expected exactly 4 RLS policies on bjj_roll_events').toHaveLength(4)
    expect(policyHeaders!.map((s) => s.toLowerCase())).toEqual(
      expect.arrayContaining([
        expect.stringContaining('for select'),
        expect.stringContaining('for insert'),
        expect.stringContaining('for update'),
        expect.stringContaining('for delete'),
      ]),
    )

    // Owner check must use the bjj_sections → workouts → auth.uid() chain.
    expect(sql).toMatch(/auth\.uid\(\)/i)
    expect(sql).toMatch(/public\.bjj_sections\s+s/i)
    expect(sql).toMatch(/public\.workouts\s+w\s+on\s+w\.id\s*=\s*s\.workout_id/i)
  })
})

describe('bjj_roll_events migration — updated_at trigger', () => {
  it('defines a before-update trigger that sets updated_at = now()', () => {
    const sql = readMigration()
    expect(sql).toMatch(
      /create\s+or\s+replace\s+function\s+public\.set_bjj_roll_events_updated_at\s*\(\s*\)\s*returns\s+trigger/i,
    )
    expect(sql).toMatch(
      /create\s+trigger\s+\S*bjj_roll_events_updated_at\s+before\s+update\s+on\s+public\.bjj_roll_events/i,
    )
    expect(sql).toMatch(/new\.updated_at\s*=\s*now\(\)/i)
  })
})
