// @ts-nocheck — Deno global types not available in editor
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function errorResponse(code: string, message: string, status: number) {
  return new Response(JSON.stringify({ error: { code, message } }), {
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

// ── Admin check ─────────────────────────────────────────────────────────────

async function isAdmin(supabase: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  return (data?.role as string) === 'admin'
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  // GET: public for all authenticated users
  if (req.method === 'GET') {
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      return errorResponse('UNAUTHORIZED', 'Missing auth token', 401)
    }

    const supabaseUser = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return errorResponse('UNAUTHORIZED', 'Invalid or expired token', 401)
    }

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('app_settings')
      .select('registration_mode, invite_expiry_hours')
      .single()

    if (settingsError || !settings) {
      return errorResponse('NOT_FOUND', 'app_settings not found', 404)
    }

    return jsonResponse({
      registration_mode: settings.registration_mode,
      invite_expiry_hours: settings.invite_expiry_hours,
    })
  }

  // POST: admin only
  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} not allowed`, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return errorResponse('UNAUTHORIZED', 'Missing auth token', 401)
  }

  const supabaseUser = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  })

  // Validate calling user
  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser()
  if (authError || !user) {
    return errorResponse('UNAUTHORIZED', 'Invalid or expired token', 401)
  }

  // Verify caller is admin
  const callerIsAdmin = await isAdmin(supabaseAdmin, user.id)
  if (!callerIsAdmin) {
    return errorResponse('FORBIDDEN', 'Admin only', 403)
  }

  // Parse body
  let registrationMode: string | undefined
  let inviteExpiryHours: number | undefined
  try {
    const body = (await req.json()) as {
      registration_mode?: string
      invite_expiry_hours?: number
    }
    registrationMode = body.registration_mode
    inviteExpiryHours = body.invite_expiry_hours
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  if (registrationMode && registrationMode !== 'open' && registrationMode !== 'invite_only') {
    return errorResponse('BAD_REQUEST', 'registration_mode must be "open" or "invite_only"', 400)
  }

  if (inviteExpiryHours !== undefined && (inviteExpiryHours < 1 || inviteExpiryHours > 720)) {
    return errorResponse('BAD_REQUEST', 'invite_expiry_hours must be between 1 and 720', 400)
  }

  // Build update payload
  const updatePayload: Record<string, unknown> = {}
  if (registrationMode) updatePayload.registration_mode = registrationMode
  if (inviteExpiryHours !== undefined) updatePayload.invite_expiry_hours = inviteExpiryHours

  if (Object.keys(updatePayload).length === 0) {
    return errorResponse('BAD_REQUEST', 'No valid fields to update', 400)
  }

  const { data: settings, error: updateError } = await supabaseAdmin
    .from('app_settings')
    .update(updatePayload)
    .select('registration_mode, invite_expiry_hours')
    .single()

  if (updateError) {
    return errorResponse('INTERNAL_ERROR', 'Failed to update settings', 500)
  }

  return jsonResponse({
    registration_mode: settings.registration_mode,
    invite_expiry_hours: settings.invite_expiry_hours,
  })
})