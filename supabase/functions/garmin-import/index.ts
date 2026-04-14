// @ts-nocheck — Deno global types not available in editor
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import FitParser from 'npm:fit-file-parser'
import type { GarminMetrics } from '../_shared/garmin-schemas.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

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
 * Parse a .fit file buffer using fit-file-parser's async API.
 */
async function parseFitFile(buffer: ArrayBuffer): Promise<Record<string, unknown>> {
  const parser = new FitParser({
    force: true,
    speedUnit: 'km/h',
    lengthUnit: 'm',
    temperatureUnit: 'celsius',
    elapsedRecordField: true,
    mode: 'cascade',
  })
  return (await parser.parseAsync(buffer)) as Record<string, unknown>
}

/**
 * Derive recovery time from TSS (Training Stress Score).
 * TSS < 150  → light    → 24h
 * TSS < 300  → moderate → 48h
 * TSS >= 300 → heavy    → 72h
 */
function deriveRecoveryHours(tss: number | null | undefined): number | null {
  if (tss == null) return null
  if (tss < 150) return 24
  if (tss < 300) return 48
  return 72
}

/**
 * Derive recovery time from Training Effect (TE, scale 1.0–5.0).
 * Fallback when TSS is absent (e.g. CrossFit activities).
 * Mirrors deriveRecoveryHoursFromTrainingEffect in src/features/garmin/garmin.utils.ts.
 *
 * TE < 1.0         → null   (invalid / absent)
 * TE 1.0–1.9       → 12h   (Recovery / Easy)
 * TE 2.0–2.9       → 24h   (Aerobic)
 * TE 3.0–3.9       → 36h   (Tempo)
 * TE 4.0–4.9       → 48h   (Threshold)
 * TE ≥ 5.0         → 60h   (Overreaching)
 */
function deriveRecoveryHoursFromTrainingEffect(effect: number | null | undefined): number | null {
  if (effect == null || effect < 1.0) return null
  if (effect < 2.0) return 12
  if (effect < 3.0) return 24
  if (effect < 4.0) return 36
  if (effect < 5.0) return 48
  return 60
}

/**
 * Extract GarminMetrics from parsed FIT session data.
 */
function extractMetrics(
  session: Record<string, unknown>,
  timeInZone: Record<string, unknown>[],
): GarminMetrics {
  // time_in_zone lives at fitData.time_in_zone (top level), not inside the session.
  // The entry with reference_mesg === 18 is the whole-activity summary.
  // The array has 7 elements: [below_z1, z1, z2, z3, z4, z5, above_z5] — all in seconds.
  const activityZoneEntry = timeInZone.find((z) => z.reference_mesg === 18) as
    | Record<string, unknown>
    | undefined
  const hrZones = Array.isArray(activityZoneEntry?.time_in_hr_zone)
    ? (activityZoneEntry!.time_in_hr_zone as number[])
    : []

  // Zones are 1-indexed in the array (index 0 = below zone 1, indices 1-5 = zones 1-5)
  const zoneSeconds = (idx: number): number => (hrZones[idx] != null ? Math.round(hrZones[idx]) : 0)

  const tss = (session.training_stress_score as number | undefined) ?? null
  const te = (session.total_training_effect as number | undefined) ?? null

  return {
    elapsedTimeSeconds: Math.round((session.total_elapsed_time as number) ?? 0),
    avgHeartRate: (session.avg_heart_rate as number | undefined) ?? null,
    maxHeartRate: (session.max_heart_rate as number | undefined) ?? null,
    trainingLoad: tss,
    recoveryTimeHours: deriveRecoveryHours(tss) ?? deriveRecoveryHoursFromTrainingEffect(te),
    calories: (session.total_calories as number | undefined) ?? null,
    vo2max: (session.estimated_vo2_max as number | undefined) ?? null,
    hrZone1Seconds: zoneSeconds(1),
    hrZone2Seconds: zoneSeconds(2),
    hrZone3Seconds: zoneSeconds(3),
    hrZone4Seconds: zoneSeconds(4),
    hrZone5Seconds: zoneSeconds(5),
  }
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

  // Validate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return errorResponse('UNAUTHORIZED', 'Invalid or expired token', 401)
  }

  // Parse multipart/form-data
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return errorResponse('BAD_REQUEST', 'Expected multipart/form-data', 400)
  }

  const workoutId = formData.get('workout_id')
  if (!workoutId || typeof workoutId !== 'string') {
    return errorResponse('BAD_REQUEST', 'workout_id is required', 400)
  }

  const fileEntry = formData.get('file')
  if (!fileEntry || !(fileEntry instanceof File)) {
    return errorResponse('BAD_REQUEST', 'file is required', 400)
  }

  // Validate file size
  if (fileEntry.size > MAX_FILE_SIZE) {
    return errorResponse('PAYLOAD_TOO_LARGE', 'File exceeds 10 MB limit', 413)
  }

  // Verify the user owns this workout
  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .select('id, garmin_activity_id')
    .eq('id', workoutId)
    .eq('user_id', user.id)
    .single()

  if (workoutError || !workout) {
    return errorResponse('FORBIDDEN', 'Workout not found or access denied', 403)
  }

  // Re-import guard: delete old garmin_activity if present (CASCADE removes training_evaluations)
  if (workout.garmin_activity_id) {
    const { error: deleteError } = await supabase
      .from('garmin_activities')
      .delete()
      .eq('id', workout.garmin_activity_id)

    if (deleteError) {
      return errorResponse('INTERNAL_ERROR', 'Failed to remove previous import', 500, deleteError)
    }
  }

  // Upload .fit file to Storage
  const fileBuffer = await fileEntry.arrayBuffer()
  const timestamp = Date.now()
  const storagePath = `${user.id}/${workoutId}/${timestamp}.fit`

  const { error: uploadError } = await supabase.storage
    .from('garmin-fits')
    .upload(storagePath, fileBuffer, {
      contentType: 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    return errorResponse('INTERNAL_ERROR', 'Failed to upload file', 500, uploadError)
  }

  // Parse .fit file
  let fitData: Record<string, unknown>
  try {
    fitData = await parseFitFile(fileBuffer)
  } catch (err) {
    console.error('[garmin-import] parseFitFile threw:', err)
    return errorResponse('UNPROCESSABLE_ENTITY', 'invalid_fit_file', 422, {
      reason: 'parse_failed',
      detail: String(err),
    })
  }

  // Extract session metrics
  // In cascade mode, fit-file-parser nests sessions under fitData.activity.sessions
  const fitActivity = fitData.activity as Record<string, unknown> | undefined
  const sessions = fitActivity?.sessions as Record<string, unknown>[] | undefined
  const session = sessions?.[0]

  if (!session) {
    console.error('[garmin-import] no session found. fitData keys:', Object.keys(fitData))
    return errorResponse('UNPROCESSABLE_ENTITY', 'invalid_fit_file', 422, {
      reason: 'no_session',
      fitDataKeys: Object.keys(fitData),
    })
  }

  const timeInZone = Array.isArray(fitData.time_in_zone)
    ? (fitData.time_in_zone as Record<string, unknown>[])
    : []

  let metrics: GarminMetrics
  try {
    metrics = extractMetrics(session, timeInZone)
  } catch (err) {
    console.error('[garmin-import] extractMetrics threw:', err)
    return errorResponse('UNPROCESSABLE_ENTITY', 'invalid_fit_file', 422, {
      reason: 'extract_failed',
      detail: String(err),
    })
  }

  // INSERT into garmin_activities
  const { data: activity, error: insertError } = await supabase
    .from('garmin_activities')
    .insert({
      workout_id: workoutId,
      user_id: user.id,
      file_path: storagePath,
      elapsed_time_seconds: metrics.elapsedTimeSeconds,
      avg_heart_rate: metrics.avgHeartRate,
      max_heart_rate: metrics.maxHeartRate,
      training_load: metrics.trainingLoad,
      recovery_time_hours: metrics.recoveryTimeHours,
      calories: metrics.calories,
      vo2max: metrics.vo2max,
      hr_zone_1_seconds: metrics.hrZone1Seconds,
      hr_zone_2_seconds: metrics.hrZone2Seconds,
      hr_zone_3_seconds: metrics.hrZone3Seconds,
      hr_zone_4_seconds: metrics.hrZone4Seconds,
      hr_zone_5_seconds: metrics.hrZone5Seconds,
    })
    .select('id')
    .single()

  if (insertError || !activity) {
    console.error('[garmin-import] insertError:', JSON.stringify(insertError))
    return errorResponse('INTERNAL_ERROR', 'Failed to save activity', 500, insertError)
  }

  // UPDATE workouts.garmin_activity_id
  const { error: updateError } = await supabase
    .from('workouts')
    .update({ garmin_activity_id: activity.id })
    .eq('id', workoutId)

  if (updateError) {
    return errorResponse('INTERNAL_ERROR', 'Failed to link activity to workout', 500, updateError)
  }

  return jsonResponse({ garminActivityId: activity.id, metrics }, 201)
})
