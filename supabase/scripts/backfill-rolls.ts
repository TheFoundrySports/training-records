#!/usr/bin/env -S deno run --allow-net --allow-env
// @ts-nocheck — Deno global types not available in editor
/**
 * EF-driven richer backfill — replaces the PR 1 SQL stub with
 * LLM-extracted roll events for existing sparring sections.
 *
 * How it works:
 *   1. Scan bjj_sections joined to workouts for sections whose
 *      goal / raw_description / ai_description matches the sparring
 *      keyword set (same heuristic as the PR 1 SQL backfill:
 *      `sparring|rolls|rondas|libre|posicional`).
 *   2. For each matching section, fetch existing bjj_roll_events
 *      rows.
 *   3. Call bjj-section-ai (the existing EF) to extract proposed
 *      rolls from the section's goal + raw_description.
 *   4. Pass the proposed rolls + existing rows to
 *      planSectionBackfill (src/features/bjj/ai/planSectionBackfill.ts)
 *      which returns either { action: 'skip' } or
 *      { action: 'upsert', upserts, deletes }.
 *   5. Apply the plan via supabase.from('bjj_roll_events').upsert
 *      with onConflict: 'section_id,roll_index' + targeted delete.
 *
 * Why this script:
 *   The PR 1 SQL stub inserts status='proposed' rows with
 *   confidence=0 and source='manual' — these are placeholders that
 *   the dashboard banner counts but the athlete must review in
 *   RollReviewPanel. This script offers a richer upgrade: the LLM
 *   extracts real structured data so the rows are useful without
 *   manual review.
 *
 * Safety:
 *   - Confirmed rows are sacred (planSectionBackfill rule 1).
 *   - The script never deletes a row that planSectionBackfill didn't
 *     mark for deletion.
 *   - The script is idempotent: running twice on the same data
 *     produces the same final state.
 *
 * Usage:
 *   deno run --allow-net --allow-env supabase/scripts/backfill-rolls.ts
 *   (with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  planSectionBackfill,
  type ExistingRollRow,
} from '../../../src/features/bjj/ai/planSectionBackfill.ts'
import { parseBJJSectionAIResponse } from '../../../src/features/bjj/ai/parseBJJSectionAIResponse.ts'

const SPARRING_KEYWORDS = 'sparring|rolls|rondas|libre|posicional'
const SUPABASE_FUNCTION_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/bjj-section-ai`
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface SparringSection {
  id: string
  workout_id: string
  user_id: string
  goal: string
  raw_description: string | null
  ai_description: string | null
}

interface BackfillStats {
  sectionsScanned: number
  sectionsSkipped: { confirmed: number; noProposal: number }
  sectionsUpserted: number
  totalRowsUpserted: number
  totalRowsDeleted: number
}

async function fetchSparringSections(
  // deno-lint-ignore no-explicit-any
  supabase: any,
): Promise<SparringSection[]> {
  const { data, error } = await supabase
    .from('bjj_sections')
    .select(
      'id, workout_id, goal, raw_description, ai_description, workouts!inner(user_id, type)',
    )
    .eq('workouts.type', 'bjj')
    .or(
      `goal.ilike.%sparring%,goal.ilike.%rolls%,goal.ilike.%rondas%,goal.ilike.%libre%,goal.ilike.%posicional%,` +
        `raw_description.ilike.%sparring%,raw_description.ilike.%rolls%,raw_description.ilike.%rondas%,raw_description.ilike.%libre%,raw_description.ilike.%posicional%,` +
        `ai_description.ilike.%sparring%,ai_description.ilike.%rolls%,ai_description.ilike.%rondas%,ai_description.ilike.%libre%,ai_description.ilike.%posicional%`,
    )

  if (error) throw new Error(`Failed to fetch sparring sections: ${error.message}`)
  return (data ?? []).map((row: { workouts: { user_id: string } } & Omit<SparringSection, 'user_id'>) => ({
    ...row,
    user_id: row.workouts.user_id,
  }))
}

async function fetchExistingRolls(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  sectionId: string,
): Promise<ExistingRollRow[]> {
  const { data, error } = await supabase
    .from('bjj_roll_events')
    .select('roll_index, status, source, confidence')
    .eq('section_id', sectionId)
  if (error) throw new Error(`Failed to fetch existing rolls: ${error.message}`)
  return (data ?? []) as ExistingRollRow[]
}

async function callBJJSectionAI(
  userId: string,
  sectionGoal: string,
  rawDescription: string,
): Promise<ReturnType<typeof parseBJJSectionAIResponse>> {
  const res = await fetch(SUPABASE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Forward the user's identity via the Authorization header so the EF
      // runs in the user's auth context (not service role).
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      'X-User-Id': userId,
    },
    body: JSON.stringify({
      section_goal: sectionGoal,
      raw_description: rawDescription,
    }),
  })
  if (!res.ok) {
    return {
      ok: false,
      error: {
        code: 'INVALID_AI_RESPONSE',
        message: `bjj-section-ai returned ${res.status}`,
        issues: [],
      },
    }
  }
  const json = await res.json()
  return parseBJJSectionAIResponse(json)
}

async function applyUpsert(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  sectionId: string,
  workoutId: string,
  userId: string,
  // deno-lint-ignore no-explicit-any
  upserts: any[],
): Promise<void> {
  if (upserts.length === 0) return
  // The upsert rows from planSectionBackfill carry roll_index / role /
  // outcome / position_from / etc. but not the FK fields (workout_id,
  // user_id) or status. Add them here so the row matches the table schema.
  const rows = upserts.map((u) => ({
    user_id: userId,
    workout_id: workoutId,
    section_id: sectionId,
    roll_index: u.roll_index,
    role: u.role,
    outcome: u.outcome,
    position_from: u.position_from,
    position_to: u.position_to,
    technique_names: u.technique_names,
    confidence: u.confidence,
    raw_excerpt: u.raw_excerpt,
    status: 'proposed',
    source: u.source,
  }))
  const { error } = await supabase
    .from('bjj_roll_events')
    .upsert(rows, { onConflict: 'section_id,roll_index' })
  if (error) throw new Error(`Upsert failed: ${error.message}`)
}

async function applyDeletes(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  sectionId: string,
  // deno-lint-ignore no-explicit-any
  deletes: any[],
): Promise<void> {
  for (const d of deletes) {
    const { error } = await supabase
      .from('bjj_roll_events')
      .delete()
      .eq('section_id', sectionId)
      .eq('roll_index', d.roll_index)
      .eq('status', 'proposed') // double-safety: only delete proposed rows
    if (error) throw new Error(`Delete failed for roll_index=${d.roll_index}: ${error.message}`)
  }
}

async function main() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  if (!supabaseUrl) {
    console.error('SUPABASE_URL is required')
    Deno.exit(1)
  }
  const supabase = createClient(supabaseUrl, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const stats: BackfillStats = {
    sectionsScanned: 0,
    sectionsSkipped: { confirmed: 0, noProposal: 0 },
    sectionsUpserted: 0,
    totalRowsUpserted: 0,
    totalRowsDeleted: 0,
  }

  const sections = await fetchSparringSections(supabase)
  console.log(`[backfill-rolls] Found ${sections.length} sparring sections`)

  for (const section of sections) {
    stats.sectionsScanned++
    const existingRows = await fetchExistingRolls(supabase, section.id)
    const aiResult = await callBJJSectionAI(
      section.user_id,
      section.goal,
      section.raw_description ?? '',
    )

    // The LLM might fail (no API key, rate limit, etc.) — fall back to
    // skipping rather than surfacing an error mid-loop.
    if (!aiResult.ok) {
      console.warn(`[backfill-rolls] LLM failed for section=${section.id}: ${aiResult.error.message}`)
      stats.sectionsSkipped.noProposal++
      continue
    }

    const plan = planSectionBackfill({
      sectionId: section.id,
      proposedRolls: aiResult.data.rolls,
      existingRows,
    })

    if (plan.action === 'skip') {
      stats.sectionsSkipped[plan.reason === 'has_confirmed_rolls' ? 'confirmed' : 'noProposal']++
      continue
    }

    await applyUpsert(supabase, section.id, section.workout_id, section.user_id, plan.upserts)
    await applyDeletes(supabase, section.id, plan.deletes)
    stats.sectionsUpserted++
    stats.totalRowsUpserted += plan.upserts.length
    stats.totalRowsDeleted += plan.deletes.length
    console.log(
      `[backfill-rolls] section=${section.id} upserted=${plan.upserts.length} deleted=${plan.deletes.length}`,
    )
  }

  console.log('[backfill-rolls] Done', JSON.stringify(stats, null, 2))
}

if (import.meta.main) {
  await main()
}
