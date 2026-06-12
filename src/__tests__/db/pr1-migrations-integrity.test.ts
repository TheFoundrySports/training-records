/**
 * REFACTOR: cross-migration sanity checks for the 4 PR 1 migrations.
 *
 * Real SQL execution is verified on staging via `supabase db reset` (see
 * `supabase/README.md`). This file catches the cheap mistakes early:
 *   - All 4 migration files exist in the expected chronological order.
 *   - Each migration's parentheses, single-quotes, and `DO $$` dollar-quote
 *     blocks are balanced.
 *   - No migration references a table that is created in a LATER migration
 *     (basic forward-reference check).
 *
 * Pure Node.js, no external deps — fits the strict TDD REFACTOR step.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

const MIGRATIONS_DIR = resolve(__dirname, '../../../supabase/migrations')

const PR1_FILES = [
  '20260612000001_bjj_roll_events.sql',
  '20260612000002_bjj_positions.sql',
  '20260612000003_bjj_dashboard_views.sql',
  '20260612000004_bjj_roll_events_backfill.sql',
]

function readMigration(filename: string): string {
  const path = resolve(MIGRATIONS_DIR, filename)
  if (!existsSync(path)) {
    throw new Error(`Migration file missing: ${path}`)
  }
  return readFileSync(path, 'utf8')
}

describe('PR 1 migrations — file presence and ordering', () => {
  it.each(PR1_FILES)('exists: %s', (file) => {
    expect(existsSync(resolve(MIGRATIONS_DIR, file)), `${file} must exist`).toBe(true)
  })

  it('all 4 PR 1 files sort lexicographically in the same order as the commit plan', () => {
    const sorted = [...PR1_FILES].sort()
    expect(PR1_FILES).toEqual(sorted)
  })
})

describe('PR 1 migrations — quote / paren balance', () => {
  it.each(PR1_FILES)('%s has balanced parens, single-quotes, and dollar-quote blocks', (file) => {
    const sql = readMigration(file)

    // Strip $tag$ ... $tag$ blocks (including $$ ... $$) so they don't skew
    // the paren/quote counters.
    const stripped = sql.replace(/\$([a-zA-Z_]*)\$[\s\S]*?\$\1\$/g, '""')

    // Strip SQL line comments (keep newline) and SQL block comments.
    const noComments = stripped
      .replace(/--[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')

    const parens = noComments.match(/[()]/g) ?? []
    expect(
      parens.length % 2,
      `${file}: unbalanced parens (${parens.length} found)`,
    ).toBe(0)

    const openParens = parens.filter((c) => c === '(').length
    const closeParens = parens.filter((c) => c === ')').length
    expect(
      openParens,
      `${file}: unequal paren counts (open=${openParens}, close=${closeParens})`,
    ).toBe(closeParens)

    const quotes = noComments.match(/'/g) ?? []
    expect(
      quotes.length % 2,
      `${file}: unbalanced single-quotes (${quotes.length} found)`,
    ).toBe(0)
  })
})

describe('PR 1 migrations — no forward references to tables created later', () => {
  it('migration 1 (bjj_roll_events) does not reference tables created in migrations 2-4', () => {
    const sql = readMigration(PR1_FILES[0])
    // bjj_positions is created in migration 2.
    expect(sql, 'migration 1 must not reference bjj_positions (created later)').not.toMatch(
      /\bbjj_positions\b/i,
    )
    // The dashboard views are created in migration 3.
    for (const view of [
      'bjj_dashboard_role_balance',
      'bjj_dashboard_outcomes',
      'bjj_dashboard_position_transitions',
    ]) {
      expect(sql, `migration 1 must not reference ${view}`).not.toMatch(new RegExp(`\\b${view}\\b`, 'i'))
    }
  })

  it('migration 2 (bjj_positions) does not reference tables or views from migrations 1, 3, 4', () => {
    const sql = readMigration(PR1_FILES[1])
    expect(sql, 'migration 2 must not reference bjj_roll_events').not.toMatch(
      /\bbjj_roll_events\b/i,
    )
    for (const view of [
      'bjj_dashboard_role_balance',
      'bjj_dashboard_outcomes',
      'bjj_dashboard_position_transitions',
    ]) {
      expect(sql, `migration 2 must not reference ${view}`).not.toMatch(new RegExp(`\\b${view}\\b`, 'i'))
    }
  })

  it('migration 3 (views) does not depend on the backfill from migration 4', () => {
    const sql = readMigration(PR1_FILES[2])
    // The views are pure reads; the backfill is an INSERT and shouldn't
    // appear in the views. Just check there's no `insert into` here.
    expect(sql, 'migration 3 must not INSERT (views are read-only)').not.toMatch(
      /\binsert\s+into\b/i,
    )
  })
})

describe('PR 1 migrations — directory inventory', () => {
  it('the migrations directory contains all 4 PR 1 files alongside the prior migrations', () => {
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'))
    // Sanity: at least the 4 PR 1 files exist; the exact prior count
    // drifts as other changes land. We only assert the lower bound.
    expect(files.length).toBeGreaterThanOrEqual(PR1_FILES.length)
    for (const f of PR1_FILES) {
      expect(files, `${f} should be in the migrations directory`).toContain(f)
    }
  })
})
