// @ts-nocheck — Deno global types not available in editor
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildSystemPrompt, type BJJTechniqueRow } from './prompt.ts'
import { type BJJSectionAIResponse } from './bjj.schema.ts'
import { parseBJJSectionAIResponse } from './parseBJJSectionAIResponse.ts'

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
    // Timeout after 30s — prevents Edge Function hang on slow AI provider
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30_000)

    let res: Response
    try {
      res = await fetch(`${this.config.baseUrl}/chat/completions`, {
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
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!res.ok) {
      throw new Error(`AI provider error: ${res.status}`)
    }

    const data = await res.json() as {
      choices: Array<{
        message: {
          content?: string
          text?: string
          reasoning_details?: Array<{ text: string }>
        }
        finish_reason?: string
      }>
      base_resp?: {
        status_code: number
        status_msg: string
      }
    }

    // MiniMax error in base_resp
    if (data.base_resp && data.base_resp.status_code !== 0) {
      throw new Error(`MiniMax error ${data.base_resp.status_code}: ${data.base_resp.status_msg}`)
    }

    const msg = data.choices[0]?.message
    let raw = msg?.content ?? msg?.text ?? ''

    // Strip reasoning/thinking blocks — MiniMax embeds these in content
    // with <think>...  tags or as separate reasoning_details field
    const thinkOpen = raw.indexOf('<think>')
    const thinkClose = raw.indexOf('</think>')
    if (thinkOpen >= 0 && thinkClose > thinkOpen) {
      raw = raw.substring(thinkClose + '</think>'.length)
    }

    // Strip markdown fences
    raw = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()

    // If stripping thinking left nothing useful, return empty so caller handles it
    if (!raw) return ''

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

  // No DB row — fall back to env var with MiniMax defaults
  const envKey = Deno.env.get('OPENAI_API_KEY')
  if (envKey) {
    return {
      apiKey: envKey,
      baseUrl: 'https://api.minimax.io/v1',
      model: 'MiniMax-M3',
    }
  }

  return null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildMockResponse(
  raw_description: string,
  section_goal: string,
  techniques: BJJTechniqueRow[],
): BJJSectionAIResponse {
  return {
    ai_description: `[Mock] Mejorado: "${raw_description.slice(0, 60)}…" — enfocado en ${section_goal}.`,
    matched_technique_ids: techniques.slice(0, 2).map((t) => t.id),
    rolls: [],
  }
}

function isValidAIResponse(data: unknown): data is BJJSectionAIResponse {
  // The pure function is the source of truth for the LLM response shape.
  // Both the mock fallback and the LLM path go through parseBJJSectionAIResponse
  // so the contract is uniform — the Zod schema is the boundary, and this
  // function is the type-narrowing wrapper around it.
  return parseBJJSectionAIResponse(data).ok
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
  // Search BOTH section_goal AND raw_description for technique catalog
  const goalKeywords = extractKeywords(section_goal)
  const descKeywords = extractKeywords(raw_description)
  const allKeywords = [...new Set([...goalKeywords, ...descKeywords])].slice(0, 10)

  // Fetch the full catalog for the AI to choose from — pass ALL relevant techniques
  // so the AI can intelligently match them to the user's description
  let techniques: BJJTechniqueRow[] = []

  if (allKeywords.length > 0) {
    const orFilter = allKeywords.map((k) => `name.ilike.%${k}%`).join(',')
    const nameEsFilter = allKeywords.map((k) => `name_es.ilike.%${k}%`).join(',')
    const combinedFilter = `${orFilter},${nameEsFilter}`

    let { data, error: dbError } = await supabase
      .from('bjj_techniques')
      .select('id, name, name_es, description, category')
      .or(combinedFilter)
      .limit(30)

    // Fallback: if name_es causes an error (column doesn't exist yet), retry without it
    if (dbError && dbError.message.includes('name_es')) {
      const fallbackFilter = allKeywords.map((k) => `name.ilike.%${k}%`).join(',')
      const result = await supabase
        .from('bjj_techniques')
        .select('id, name, description, category')
        .or(fallbackFilter)
        .limit(30)
      data = result.data
      dbError = result.error
    }

    if (dbError) {
      return errorResponse('INTERNAL_ERROR', 'Failed to query techniques', 500, dbError)
    }

    techniques = (data ?? []) as BJJTechniqueRow[]
  }

  // If no keywords matched, fall back to sending the full catalog
  // so the AI can still identify techniques even without keyword matches
  if (techniques.length === 0) {
    const { data: allData, error: allError } = await supabase
      .from('bjj_techniques')
      .select('id, name, name_es, description, category')
      .limit(50)

    if (!allError && allData) {
      techniques = allData as BJJTechniqueRow[]
    }
  }

  // Resolve AI config: DB → env var → null
  const aiConfig = await resolveAIConfig(supabaseAdmin)

  // Mock fallback when no AI config is available
  if (!aiConfig) {
    return jsonResponse(buildMockResponse(raw_description, section_goal, techniques))
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

    const aiResult = parseBJJSectionAIResponse(parsed)
    if (!aiResult.ok) {
      return errorResponse('UNPROCESSABLE_ENTITY', aiResult.error.message, 422, {
        error: 'invalid_llm_response',
        issues: aiResult.error.issues,
      })
    }

    return jsonResponse({
      ai_description: aiResult.data.ai_description,
      matched_technique_ids: aiResult.data.matched_technique_ids,
      rolls: aiResult.data.rolls,
    })
  } catch (err) {
    // AI call failed (network error, timeout, provider 5xx, etc.) — fall back to mock
    // rather than surfacing a confusing 502 to the client.
    console.error('[bjj-section-ai] AI provider call failed:', err)
    return jsonResponse(buildMockResponse(raw_description, section_goal, techniques))
  }
})