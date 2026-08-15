/**
 * RED tests for seed data determinism
 * 
 * Covers REQ-BP1 (deterministic demo seed) and REQ-BP2 (catalog top-up):
 *   - seed.sql includes transition + other technique categories
 *   - seed-rolls.sql has no `order by random()` (non-deterministic)
 *   - seed-rolls.sql has technique_ids backfill statement (set-based update)
 *   - seed-rolls.sql has fail-loud guard if technique name lookup fails
 *   - all 7 categories are linked in seed-rolls.sql
 * 
 * Structural assertions on the seed files — same pattern as migration tests.
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

const SEED_SQL_PATH = resolve(__dirname, '../../../supabase/seed.sql')
const SEED_ROLLS_PATH = resolve(__dirname, '../../../supabase/seed-rolls.sql')

function readSeedSql(): string {
  if (!existsSync(SEED_SQL_PATH)) {
    throw new Error(
      `seed.sql missing at ${SEED_SQL_PATH}. The RED test must fail before GREEN implementation.`,
    )
  }
  return readFileSync(SEED_SQL_PATH, 'utf8')
}

function readSeedRolls(): string {
  if (!existsSync(SEED_ROLLS_PATH)) {
    throw new Error(
      `seed-rolls.sql missing at ${SEED_ROLLS_PATH}. The RED test must fail before GREEN implementation.`,
    )
  }
  return readFileSync(SEED_ROLLS_PATH, 'utf8')
}

describe('seed.sql — REQ-BP2 catalog top-up', () => {
  it('includes transition category techniques', () => {
    const sql = readSeedSql()
    // REQ-BP2: catalog MUST have transition techniques
    expect(sql).toMatch(/'transition'\)/i)
  })

  it('includes other category techniques', () => {
    const sql = readSeedSql()
    // REQ-BP2: catalog MUST have other techniques
    expect(sql).toMatch(/'other'\)/i)
  })

  it('has at least 2 techniques for transition category', () => {
    const sql = readSeedSql()
    // REQ-BP2: at least 2 techniques per new category
    const transitionMatches = sql.match(/'transition'\)/gi)
    expect(transitionMatches?.length).toBeGreaterThanOrEqual(2)
  })

  it('has at least 2 techniques for other category', () => {
    const sql = readSeedSql()
    const otherMatches = sql.match(/'other'\)/gi)
    expect(otherMatches?.length).toBeGreaterThanOrEqual(2)
  })
})

describe('seed-rolls.sql — REQ-BP1 deterministic seed', () => {
  it('has NO order by random() clause (non-deterministic)', () => {
    const sql = readSeedRolls()
    // REQ-BP1: seed MUST NOT use random() — it must be deterministic
    expect(sql).not.toMatch(/order\s+by\s+random\(\)/i)
  })

  it('uses explicit select id from bjj_techniques where name = lookups', () => {
    const sql = readSeedRolls()
    // REQ-BP1: explicit name-based lookups instead of random
    expect(sql).toMatch(/select\s+id\s+from\s+.*bjj_techniques.*where\s+name\s*=/i)
  })

  it('has technique_ids backfill statement (set-based update)', () => {
    const sql = readSeedRolls()
    // Design D4: set-based backfill of technique_ids from section_techniques
    expect(sql).toMatch(/update\s+[\s\S]*bjj_roll_events[\s\S]*set\s+technique_ids/i)
    expect(sql).toMatch(/array_agg\(.*technique_id\)/i)
    expect(sql).toMatch(/from\s+[\s\S]*bjj_section_techniques/i)
  })

  it('has fail-loud guard if technique name lookup fails', () => {
    const sql = readSeedRolls()
    // Design D4: abort seed if any of the 14 technique names is missing
    expect(sql).toMatch(/do\s*\$\$[\s\S]*raise\s+exception/i)
  })

  it('links techniques from all 7 categories (submission, sweep, escape, pass, takedown, transition, other)', () => {
    const sql = readSeedRolls()
    // REQ-BP1: seed must cover all 7 categories to match data.json
    // We can't directly assert category names in the seed (they resolve via lookup),
    // but we can assert the seed has enough diverse technique names that span all categories.
    // The fail-loud guard ensures the lookups succeed.
    // Indirect check: assert at least 14 distinct technique name lookups
    const nameMatches = sql.match(/where\s+name\s*=\s*'/gi)
    expect(nameMatches?.length).toBeGreaterThanOrEqual(14)
  })

  it('concentrates roll_flow onto Open Design data.json edges (canonical keys)', () => {
    const sql = readSeedRolls()
    // Open Design bars: 24/18/14/12/10/9/7. Seed must UPDATE existing
    // athlete1 rolls onto those 7 pairs so re-running seed-rolls.sql
    // reshapes already-inserted rows (ON CONFLICT DO NOTHING would not).
    expect(sql).toMatch(/generate_series\(\s*1\s*,\s*30\s*\)/)
    expect(sql).toMatch(/when n <= 24 then 'standing'/)
    expect(sql).toMatch(/when n <= 42 then 'closed_guard'/)
    expect(sql).toMatch(/when n <= 56 then 'side_control'/)
    expect(sql).toMatch(/when n <= 68 then 'back_control'/)
    expect(sql).toMatch(/when n <= 78 then 'closed_guard'/)
    expect(sql).toMatch(/when n <= 87 then 'half_guard'/)
    expect(sql).toMatch(/when n <= 24 then 'closed_guard'/)
    expect(sql).toMatch(/when n <= 42 then 'side_control'/)
    expect(sql).toMatch(/when n <= 56 then 'back_control'/)
    expect(sql).toMatch(/when n <= 68 then 'mount'/)
    expect(sql).toMatch(/when n <= 78 then 'open_guard'/)
    expect(sql).toMatch(/when n <= 87 then 'mount'/)
  })
})
