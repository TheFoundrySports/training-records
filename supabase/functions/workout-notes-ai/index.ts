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

interface WorkoutNotesAIResponse {
  enhanced_notes: string
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
    const thinkOpen = raw.indexOf('【')
    const thinkClose = raw.indexOf('】')
    if (thinkOpen >= 0 && thinkClose > thinkOpen) {
      raw = raw.substring(thinkClose + '】'.length)
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
      model: 'MiniMax-M2.7',
    }
  }

  return null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildMockResponse(notes: string): WorkoutNotesAIResponse {
  return {
    enhanced_notes: notes.trim() + ' [AI enhancement unavailable]',
  }
}

function isValidAIResponse(data: unknown): data is WorkoutNotesAIResponse {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return typeof d.enhanced_notes === 'string' && (d.enhanced_notes as string).length > 0
}

// ── Enhancement prompt ────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are an expert fitness coach and technical editor. Your job is to enhance workout notes by improving clarity, grammar, and structure.

Rules:
- Use bullet points for sets, reps, weights, and exercises
- Keep all technical fitness terms (rep, set, EMOM, AMRAP, RPE, etc.) unchanged
- Preserve specific numbers, weights, distances, and time domains exactly as written
- Improve flow and readability without changing the actual content
- Keep the tone practical and coach-like
- If the notes are already clear, still apply light formatting improvements
- Return ONLY a JSON object: {"enhanced_notes": "your enhanced text here"}
- Do NOT include any explanation, markdown fences, or additional fields outside the JSON object

Examples:
Input: "squats 3x10 at 135lbs felt heavy today"
Output: {"enhanced_notes": "• Squats: 3×10 @ 135 lbs\n• Felt heavy — consider deload next session"}

Input: "5 rounds amrap 400m run and 15 pull-ups"
Output: {"enhanced_notes": "• AMRAP (5 rounds):\n  - 400m run\n  - 15 pull-ups\n• Pacing: steady state recommended"}`
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
  let notes: string
  try {
    const body = (await req.json()) as { notes?: string }
    notes = body.notes ?? ''
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  if (!notes.trim()) {
    return errorResponse('BAD_REQUEST', 'notes is required and cannot be empty', 400)
  }

  // Resolve AI config: DB → env var → null
  const aiConfig = await resolveAIConfig(supabaseAdmin)

  // Mock fallback when no AI config is available
  if (!aiConfig) {
    return jsonResponse(buildMockResponse(notes))
  }

  // Build prompt and call AI provider
  const adapter = new AIProviderAdapter(aiConfig)

  try {
    const content = await adapter.complete([
      { role: 'system', content: buildSystemPrompt() },
      {
        role: 'user',
        content: `Raw workout notes:\n${notes}`,
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
      enhanced_notes: parsed.enhanced_notes,
    })
  } catch (err) {
    // AI call failed (network error, timeout, provider 5xx, etc.) — fall back to mock
    // rather than surfacing a confusing 502 to the client.
    console.error('[workout-notes-ai] AI provider call failed:', err)
    return jsonResponse(buildMockResponse(notes))
  }
})
