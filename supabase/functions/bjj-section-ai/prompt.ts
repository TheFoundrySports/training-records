// @ts-nocheck — Deno global types not available in editor

export interface BJJTechniqueRow {
  id: string
  name: string
  name_es: string | null
  description: string | null
  category: string | null
}

/**
 * Builds the system prompt. Each catalog line includes the canonical `id` so the
 * model can return valid `matched_technique_ids` (UUIDs are not inferable from names alone).
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

Return ONLY valid JSON:
{
  "ai_description": "<enhanced 2-4 sentence description, max 500 chars>",
  "matched_technique_ids": ["<uuid>", ...]
}

Rules:
- Respond always in Spanish
- Examine the user's raw_description carefully and infer which techniques
  from the catalog they were practicing, even if they didn't name them explicitly
- matched_technique_ids must only contain UUID strings that appear in the catalog
  lines above exactly as shown after "id: " (copy each id verbatim, character for character)
- If no techniques are clearly relevant, return []
- Do not invent techniques or ids not present in the catalog
- Keep ai_description under 500 characters
- Return ONLY valid JSON, no markdown, no explanation`
}
