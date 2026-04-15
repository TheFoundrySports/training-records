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

interface WorkoutProposal {
  title: string
  type: 'crossfit' | 'functional' | 'bjj'
  performedAt: string
  durationMinutes: number
  notes: string
  rpe: number
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

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return errorResponse('UNAUTHORIZED', 'Invalid or expired token', 401)
  }

  let prompt: string
  try {
    const body = (await req.json()) as { prompt?: string }
    prompt = body.prompt ?? ''
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  if (!prompt.trim()) {
    return errorResponse('BAD_REQUEST', 'prompt is required', 400)
  }

  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')

  // If no API key, return a deterministic mock response for local dev
  if (!openaiApiKey) {
    const mockWorkout: WorkoutProposal = {
      title: 'AI Generated WOD',
      type: 'crossfit',
      performedAt: new Date().toISOString(),
      durationMinutes: 45,
      notes: `Generated from prompt: ${prompt}`,
      rpe: 7,
    }
    return jsonResponse(mockWorkout)
  }

  try {
    const systemPrompt = `You are a CrossFit and functional training coach. 
Generate a structured workout based on the user's description.
Return ONLY a JSON object with these fields:
- title: string (concise workout name)
- type: "crossfit" | "functional"
- performedAt: ISO8601 datetime string (today's date and time)
- durationMinutes: number (integer 1-300)
- notes: string (workout description with exercises, reps, sets)
- rpe: number (integer 1-10, expected perceived exertion)

Do not include any explanation, only the JSON object.`

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
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
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

    const workout = JSON.parse(content) as WorkoutProposal
    return jsonResponse(workout)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate workout'
    return errorResponse('AI_ERROR', message, 502, err)
  }
})
