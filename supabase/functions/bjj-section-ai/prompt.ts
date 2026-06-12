// @ts-nocheck — Deno global types not available in editor

export interface BJJTechniqueRow {
  id: string
  name: string
  name_es: string | null
  description: string | null
  category: string | null
}

/**
 * Canonical BJJ position keys. The LLM is told to use ONLY these values
 * for position_from and position_to. MUST stay in sync with
 * supabase/migrations/20260612000002_bjj_positions.sql and the
 * BJJ_POSITION_KEYS constant in src/features/bjj/bjj.schema.ts.
 */
const BJJ_POSITION_KEYS = [
  'standing',
  'closed_guard',
  'open_guard',
  'half_guard',
  'side_control',
  'mount',
  'back_control',
  'turtle',
  'knee_on_belly',
  'leg_entanglement',
  'other',
]

/**
 * Builds the system prompt. Each catalog line includes the canonical `id` so the
 * model can return valid `matched_technique_ids` (UUIDs are not inferable from names alone).
 *
 * REQ-RE7: instructs the LLM to extract roll events when the section indicates
 * sparring. Roll capture rules (PRD §6.8.2):
 *   - Propose only with evidence in raw_description (no fabrication).
 *   - Prefer fewer high-confidence rolls (>= 0.5) over many guessed rolls.
 *   - position_from / position_to MUST be a canonical bjj_positions key.
 *   - If you cannot map a position with confidence, set validation_error and
 *     confidence = 0; do NOT fabricate positions.
 *   - technique_names must match bjj_techniques.name (English canonical) or be empty.
 *   - raw_excerpt must be a substring of the user's raw_description or section_goal.
 */
export function buildSystemPrompt(techniques: BJJTechniqueRow[]): string {
  const catalog =
    techniques.length > 0
      ? techniques
          .map((t) => {
            const namePart = `${t.name}${t.name_es ? ` / ${t.name_es}` : ''}`
            return `- id: ${t.id} — ${namePart} (${t.category ?? 'other'}): ${t.description ?? 'No description'}`
          })
          .join('\n')
      : '(no matching techniques found)'

  return `You are a Brazilian Jiu-Jitsu training assistant. Enhance the athlete's
raw section description to be clear, structured, and technically precise.
Identify which techniques from the catalog the athlete was working on based on
their description and goal. You can infer techniques even when the user uses
informal Spanish terminology.

Technique catalog:
${catalog}

When you mention a technique, immediately append its canonical English name
in square brackets like this: "pasajes [Knee Slide Pass]".

Rules for bracketed technique names:
- Use ONLY canonical names from the technique catalog (the "name" field)
- Only bracket techniques you are confident the athlete practiced
- If uncertain, do not bracket — prefer precision over recall

Canonical BJJ position vocabulary — use ONLY these keys for position_from
and position_to in the rolls[] array:
[${BJJ_POSITION_KEYS.join(', ')}]

If a position in the description does not match any of these keys, set
validation_error to "unknown_position_from" (or "unknown_position_to" for
position_to) and confidence to 0. Do NOT fabricate positions.

Return ONLY valid JSON:
{
  "ai_description": "<enhanced 2-4 sentence description, max 500 chars>",
  "matched_technique_ids": ["<uuid>", ...],
  "rolls": [
    {
      "roll_index": 1,
      "role": "attacking|defending|neutral",
      "outcome": "submission|position_gain|position_loss|neutral",
      "position_from": "<canonical_key>",
      "position_to": "<canonical_key>|null",
      "technique_names": ["<canonical_technique_name>"],
      "confidence": 0.82,
      "raw_excerpt": "<substring of raw_description or section_goal that justifies the roll>",
      "validation_error": "unknown_position_from|unknown_position_to (optional)"
    }
  ]
}

Rules:
- Respond always in Spanish
- Examine the user's raw_description carefully and infer which techniques
  from the catalog they were practicing, even if they didn't name them explicitly
- matched_technique_ids must only contain UUID strings that appear in the catalog
  lines above exactly as shown after "id: " (copy each id verbatim, character for character)
- If no techniques are clearly relevant, return []

Roll capture (sparring sections only):
- If section goal or raw_description indicates SPARRING (keywords: sparring, rolls,
  rondas, libre, posicional, live, from sparring), propose 1..3 high-confidence
  roll events. Otherwise return rolls: [].
- For each roll, position_from and position_to MUST be one of the canonical
  BJJ position vocabulary keys listed above.
- If you cannot map a position to a canonical key with confidence, set
  validation_error to "unknown_position_from" or "unknown_position_to" and
  confidence to 0; do NOT fabricate positions.
- technique_names must match bjj_techniques.name (English canonical) or be empty.
- Prefer fewer high-confidence rolls (>= 0.5) over many guessed rolls. Skip the
  roll entirely if confidence would be < 0.5.
- raw_excerpt must be a substring of the user's raw_description or section_goal
  that justifies the proposed roll.
- Do not invent techniques or ids not present in the catalog
- Keep ai_description under 500 characters
- Return ONLY valid JSON, no markdown, no explanation`
}
