// @ts-nocheck — Deno global types not available in editor
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function errorResponse(code: string, message: string, status: number, details: unknown = {}) {
  return new Response(JSON.stringify({ error: { code, message, details } }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface BJJTechniqueRow {
  id: string
  name: string
  description: string | null
  category: string | null
}

interface BJJSectionAIResponse {
  ai_description: string
  matched_technique_ids: string[]
}

function isValidAIResponse(data: unknown): data is BJJSectionAIResponse {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return (
    typeof d.ai_description === 'string' &&
    d.ai_description.length > 0 &&
    Array.isArray(d.matched_technique_ids) &&
    (d.matched_technique_ids as unknown[]).every((id) => typeof id === 'string')
  )
}

function buildSystemPrompt(techniques: BJJTechniqueRow[]): string {
  const catalog =
    techniques.length > 0
      ? techniques
          .map(
            (t) => `- ${t.name} (${t.category ?? 'other'}): ${t.description ?? 'No description'}`,
          )
          .join('\n')
      : '(no matching techniques found)'

  return `You are a Brazilian Jiu-Jitsu training assistant. Enhance the athlete's
raw section description to be clear, structured, and technically precise.
Reference only techniques from the catalog where genuinely relevant.

Technique catalog:
${catalog}

Return ONLY valid JSON:
{
  "ai_description": "<enhanced 2-4 sentence description, max 500 chars>",
  "matched_technique_ids": ["<uuid>", ...]
}

Rules:
- matched_technique_ids must only contain IDs from the catalog above
- If no techniques are clearly relevant, return []
- Do not invent techniques not in the catalog
- Keep ai_description under 500 characters
- Return ONLY valid JSON, no markdown, no explanation`
}

function extractKeywords(rawDescription: string): string[] {
  return rawDescription
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
    .filter((w) => w.length >= 4)
    .slice(0, 5)
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} not allowed`, 405)
  }

  // Auth check
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return errorResponse('UNAUTHORIZED', 'Missing auth token', 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  })

  // Validate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return errorResponse('UNAUTHORIZED', 'Invalid or expired token', 401)
  }

  // Parse and validate body
  let section_goal: string
  let raw_description: string
  try {
    const body = (await req.json()) as { section_goal?: string; raw_description?: string }
    section_goal = body.section_goal ?? ''
    raw_description = body.raw_description ?? ''
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  if (!section_goal.trim()) {
    return errorResponse('BAD_REQUEST', 'section_goal is required', 400)
  }

  if (!raw_description.trim()) {
    return errorResponse('BAD_REQUEST', 'raw_description is required', 400)
  }

  if (raw_description.trim().length < 10) {
    return errorResponse('BAD_REQUEST', 'raw_description too short (minimum 10 characters)', 400)
  }

  // ILIKE keyword query on bjj_techniques
  const keywords = extractKeywords(raw_description)

  let techniques: BJJTechniqueRow[] = []

  if (keywords.length > 0) {
    const orFilter = keywords.map((k) => `name.ilike.%${k}%`).join(',')
    const { data, error: dbError } = await supabase
      .from('bjj_techniques')
      .select('id, name, description, category')
      .or(orFilter)
      .limit(15)

    if (dbError) {
      return errorResponse('INTERNAL_ERROR', 'Failed to query techniques', 500, dbError)
    }

    techniques = (data ?? []) as BJJTechniqueRow[]
  }

  // Mock fallback when OPENAI_API_KEY is absent
  if (!openaiApiKey) {
    return jsonResponse({
      ai_description: `[Mock] Enhanced: "${raw_description.slice(0, 60)}…" — focused on ${section_goal}.`,
      matched_technique_ids: techniques.slice(0, 2).map((t: BJJTechniqueRow) => t.id),
    })
  }

  // Build prompt and call OpenAI
  const systemPrompt = buildSystemPrompt(techniques)

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Section goal: ${section_goal}\nRaw description: ${raw_description}`,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    })

    if (!openaiResponse.ok) {
      const err = await openaiResponse.text()
      return errorResponse('AI_ERROR', `OpenAI API error: ${openaiResponse.status}`, 502, err)
    }

    const openaiData = (await openaiResponse.json()) as {
      choices: Array<{ message: { content: string } }>
    }

    const content = openaiData.choices?.[0]?.message?.content
    if (!content) {
      return errorResponse('AI_ERROR', 'Empty response from OpenAI', 502)
    }

    const parsed: unknown = JSON.parse(content)

    if (!isValidAIResponse(parsed)) {
      return errorResponse('UNPROCESSABLE_ENTITY', 'Invalid AI response shape', 422, {
        error: 'invalid_llm_response',
      })
    }

    return jsonResponse({
      ai_description: parsed.ai_description,
      matched_technique_ids: parsed.matched_technique_ids,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to call AI service'
    return errorResponse('AI_ERROR', message, 502, err)
  }
})
