// @ts-nocheck — Deno global types not available in editor
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isValidEvaluationResponse, type EvaluationResponse } from '../_shared/garmin-schemas.ts'

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

/**
 * Build the evaluation prompt for GPT-4o-mini.
 * Returns a system prompt that instructs the model to return ONLY valid JSON.
 */
function buildEvaluationPrompt(activity: Record<string, unknown>): string {
  const elapsedMin = activity.elapsed_time_seconds
    ? Math.round((activity.elapsed_time_seconds as number) / 60)
    : null

  const totalZoneSeconds =
    ((activity.hr_zone_1_seconds as number) ?? 0) +
    ((activity.hr_zone_2_seconds as number) ?? 0) +
    ((activity.hr_zone_3_seconds as number) ?? 0) +
    ((activity.hr_zone_4_seconds as number) ?? 0) +
    ((activity.hr_zone_5_seconds as number) ?? 0)

  const zonePct = (seconds: number): string =>
    totalZoneSeconds > 0 ? `${Math.round((seconds / totalZoneSeconds) * 100)}%` : '0%'

  const lines: string[] = [
    'You are an expert endurance and strength training coach analyzing a Garmin workout.',
    '',
    '## Athlete Metrics',
    elapsedMin != null ? `- Duration: ${elapsedMin} minutes` : '',
    activity.avg_heart_rate ? `- Average heart rate: ${activity.avg_heart_rate} bpm` : '',
    activity.max_heart_rate ? `- Max heart rate: ${activity.max_heart_rate} bpm` : '',
    activity.training_load != null
      ? `- Training Stress Score (TSS): ${activity.training_load}`
      : '',
    activity.recovery_time_hours != null
      ? `- Estimated recovery time: ${activity.recovery_time_hours}h`
      : '',
    activity.calories != null ? `- Calories burned: ${activity.calories} kcal` : '',
    activity.vo2max != null ? `- Estimated VO2max: ${activity.vo2max} ml/kg/min` : '',
    '',
    '## Heart Rate Zone Distribution',
    `- Zone 1 (recovery):   ${zonePct(activity.hr_zone_1_seconds as number)} (${activity.hr_zone_1_seconds}s)`,
    `- Zone 2 (aerobic):    ${zonePct(activity.hr_zone_2_seconds as number)} (${activity.hr_zone_2_seconds}s)`,
    `- Zone 3 (tempo):      ${zonePct(activity.hr_zone_3_seconds as number)} (${activity.hr_zone_3_seconds}s)`,
    `- Zone 4 (threshold):  ${zonePct(activity.hr_zone_4_seconds as number)} (${activity.hr_zone_4_seconds}s)`,
    `- Zone 5 (VO2max):     ${zonePct(activity.hr_zone_5_seconds as number)} (${activity.hr_zone_5_seconds}s)`,
    '',
    '## Instructions',
    'Based on the metrics above, provide a training evaluation as a JSON object.',
    'The JSON must have EXACTLY these fields:',
    '',
    '{',
    '  "summary": "<2-3 sentence assessment of the session quality and physiological impact>",',
    '  "readiness_level": "<one of: excellent | good | moderate | low | rest>",',
    '  "next_session_suggestion": "<specific recommendation for the next training session>",',
    '  "adaptation_warning": "<optional string: note any concerning patterns or overtraining risk, or null if none>"',
    '}',
    '',
    'Readiness levels:',
    '- excellent: athlete is well-recovered, ready for high intensity',
    '- good: athlete can train normally',
    '- moderate: some fatigue, prefer moderate intensity',
    '- low: significant fatigue, light training only',
    '- rest: recovery day recommended',
    '',
    'Return ONLY valid JSON, no markdown, no explanation, no code block.',
  ].filter((line) => line !== null && line !== undefined)

  return lines.join('\n')
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

  // Parse body
  let garminActivityId: string
  try {
    const body = (await req.json()) as { garmin_activity_id?: string }
    garminActivityId = body.garmin_activity_id ?? ''
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  if (!garminActivityId) {
    return errorResponse('BAD_REQUEST', 'garmin_activity_id is required', 400)
  }

  // Fetch activity and verify ownership
  const { data: activity, error: activityError } = await supabase
    .from('garmin_activities')
    .select('*')
    .eq('id', garminActivityId)
    .single()

  if (activityError || !activity) {
    return errorResponse('NOT_FOUND', 'Garmin activity not found', 404)
  }

  if (activity.user_id !== user.id) {
    return errorResponse('FORBIDDEN', 'Access denied', 403)
  }

  // Build prompt and call OpenAI
  const systemPrompt = buildEvaluationPrompt(activity)

  // If no API key, return deterministic mock for local dev
  if (!openaiApiKey) {
    const mockEvaluation: EvaluationResponse = {
      summary: 'Mock evaluation: session completed with good intensity distribution.',
      readiness_level: 'good',
      next_session_suggestion: 'Consider a moderate aerobic session in 24-48 hours.',
      adaptation_warning: null,
    }

    const { data: inserted, error: insertError } = await supabase
      .from('training_evaluations')
      .insert({
        garmin_activity_id: garminActivityId,
        user_id: user.id,
        summary: mockEvaluation.summary,
        readiness_level: mockEvaluation.readiness_level,
        next_session_suggestion: mockEvaluation.next_session_suggestion,
        adaptation_warning: mockEvaluation.adaptation_warning,
      })
      .select('id')
      .single()

    if (insertError || !inserted) {
      return errorResponse('INTERNAL_ERROR', 'Failed to save evaluation', 500, insertError)
    }

    return jsonResponse({ evaluation: { ...mockEvaluation, id: inserted.id } }, 201)
  }

  let evaluation: EvaluationResponse
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
          { role: 'user', content: 'Evaluate this training session.' },
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

    const parsed = JSON.parse(content)

    if (!isValidEvaluationResponse(parsed)) {
      return errorResponse('UNPROCESSABLE_ENTITY', 'invalid_llm_response', 422, {
        error: 'invalid_llm_response',
      })
    }

    evaluation = parsed
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to evaluate training'
    return errorResponse('AI_ERROR', message, 502, err)
  }

  // INSERT into training_evaluations
  const { data: inserted, error: insertError } = await supabase
    .from('training_evaluations')
    .insert({
      garmin_activity_id: garminActivityId,
      user_id: user.id,
      summary: evaluation.summary,
      readiness_level: evaluation.readiness_level,
      next_session_suggestion: evaluation.next_session_suggestion,
      adaptation_warning: evaluation.adaptation_warning,
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    return errorResponse('INTERNAL_ERROR', 'Failed to save evaluation', 500, insertError)
  }

  return jsonResponse({ evaluation: { ...evaluation, id: inserted.id } }, 201)
})
