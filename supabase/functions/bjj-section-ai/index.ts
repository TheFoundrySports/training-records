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

// ── AI Provider Adapter ──────────────────────────────────────────────────────

interface AIConfig {
  apiKey: string
  baseUrl: string
  model: string
}

interface ChatMessage {
  role: 'system' | 'user'
  content: string
}

class AIProviderAdapter {
  constructor(private config: AIConfig) {}

  async complete(messages: ChatMessage[]): Promise<string> {
    const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: 0.3,
        stream: false,
        extra_body: { reasoning_split: true },
      }),
    })

    if (!res.ok) {
      throw new Error(`AI provider error: ${res.status}`)
    }

    const data = await res.json() as {
      choices: Array<{
        message: {
          content?: string
          text?: string
        }
      }>
    }
    const msg = data.choices[0]?.message
    let raw = msg?.content ?? msg?.text ?? ''

    // MiniMax embeds thinking in <think>...</think> tags — strip them
    // MiniMax thinking comes in <think>...</think> tags BEFORE the JSON content.
    // Since thinking is always before the JSON and JSON always starts with '{',
    // we strip thinking by finding the first '{' and taking everything from there.
    const firstBrace = raw.indexOf('{')
    raw = firstBrace >= 0 ? raw.substring(firstBrace) : raw

    // Strip markdown fences (some providers wrap JSON in them)
    raw = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()

    return raw
  }
}

// ── Config resolver: DB first, env fallback, null if neither ────────────────

async function resolveAIConfig(supabaseAdmin: ReturnType<typeof createClient>): Promise<AIConfig | null> {
  const { data } = await supabaseAdmin
    .from('ai_settings')
    .select('provider_name, base_url, model')
    .limit(1)
    .maybeSingle()

  if (data) {
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) return null
    return {
      apiKey,
      baseUrl: data.base_url as string,
      model: data.model as string,
    }
  }

  // No DB row — fall back to env var with defaults
  const envKey = Deno.env.get('OPENAI_API_KEY')
  if (envKey) {
    return {
      apiKey: envKey,
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    }
  }

  return null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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
- Respond always in Spanish
- matched_technique_ids must only contain IDs from the catalog above
- If no techniques are clearly relevant, return []
- Do not invent techniques not in the catalog
- Keep ai_description under 500 characters
- Return ONLY valid JSON, no markdown, no explanation`
}

function extractKeywords(rawDescription: string): string[] {
  return rawDescription
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ]/g, '').toLowerCase())
    .filter((w) => w.length >= 4)
    .slice(0, 5)
}

// ── Main handler ─────────────────────────────────────────────────────────────

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

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  })

  // Service-role client for config reads (bypasses RLS)
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

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

  // Resolve AI config: DB → env var → null
  const aiConfig = await resolveAIConfig(supabaseAdmin)

  // Mock fallback when no AI config is available
  if (!aiConfig) {
    return jsonResponse({
      ai_description: `[Mock] Mejorado: "${raw_description.slice(0, 60)}…" — enfocado en ${section_goal}.`,
      matched_technique_ids: techniques.slice(0, 2).map((t: BJJTechniqueRow) => t.id),
    })
  }

  // Build prompt and call AI provider
  const systemPrompt = buildSystemPrompt(techniques)
  const adapter = new AIProviderAdapter(aiConfig)

  try {
    const content = await adapter.complete([
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Section goal: ${section_goal}\nRaw description: ${raw_description}`,
      },
    ])

    if (!content) {
      return errorResponse('AI_ERROR', 'Empty response from AI provider', 502)
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
