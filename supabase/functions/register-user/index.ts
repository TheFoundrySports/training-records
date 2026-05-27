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

  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} not allowed`, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Service-role client bypasses RLS
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  // Parse body
  let email: string
  let password: string
  let token: string | undefined
  try {
    const body = (await req.json()) as { email?: string; password?: string; token?: string }
    email = body.email ?? ''
    password = body.password ?? ''
    token = body.token
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  if (!email || !password) {
    return errorResponse('BAD_REQUEST', 'email and password are required', 400)
  }

  // 1. Read app_settings
  const { data: settings, error: settingsError } = await supabaseAdmin
    .from('app_settings')
    .select('registration_mode')
    .single()

  if (settingsError || !settings) {
    return errorResponse('INTERNAL_ERROR', 'Could not read app_settings', 500)
  }

  // 2. Validate invite-only mode
  if (settings.registration_mode === 'invite_only' && !token) {
    return errorResponse('REGISTRATION_BY_INVITATION_ONLY', 'Registration by invitation only', 400)
  }

  // 3. Validate token if provided
  if (token) {
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('invitations')
      .select('id, status, expires_at, email')
      .eq('token', token)
      .eq('status', 'pending')
      .single()

    if (inviteError || !invitation) {
      return errorResponse('INVALID_TOKEN', 'Invalid or already used invitation token', 400)
    }

    if (new Date(invitation.expires_at) <= new Date()) {
      return errorResponse('TOKEN_EXPIRED', 'Invitation token has expired', 400)
    }

    // Verify email matches invitation
    if (invitation.email !== email) {
      return errorResponse('EMAIL_MISMATCH', 'Email does not match invitation', 400)
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabaseAdmin
      .from('invitations')
      .update({ status: 'accepted', used_at: new Date().toISOString() })
      .eq('token', token)

    if (updateError) {
      return errorResponse('INTERNAL_ERROR', 'Failed to update invitation', 500)
    }
  }

  // 4. Create user
  const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'athlete' },
  })

  if (createError) {
    if (createError.message.includes('already been registered') || createError.message.includes('already exists')) {
      return errorResponse('EMAIL_ALREADY_EXISTS', 'Email already registered', 409)
    }
    return errorResponse('USER_CREATION_FAILED', createError.message, 500)
  }

  return jsonResponse({ success: true, user_id: authUser.id })
})