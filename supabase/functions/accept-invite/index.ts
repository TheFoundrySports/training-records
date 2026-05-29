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

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  // Parse body
  let token: string
  let password: string
  try {
    const body = (await req.json()) as { token?: string; password?: string }
    token = body.token ?? ''
    password = body.password ?? ''
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  if (!token || !password) {
    return errorResponse('BAD_REQUEST', 'token and password are required', 400)
  }

  // 1. Validate token
  const { data: invitation, error: inviteError } = await supabaseAdmin
    .from('invitations')
    .select('id, email, status, expires_at')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (inviteError || !invitation) {
    return errorResponse('INVALID_TOKEN', 'Invalid or already used invitation token', 400)
  }

  if (new Date(invitation.expires_at) <= new Date()) {
    return errorResponse('TOKEN_EXPIRED', 'Invitation token has expired', 400)
  }

  // 2. Check if user with that email already exists
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
  const existingUser = existingUsers?.users.find((u) => u.email === invitation.email)

  let userId: string

  if (existingUser) {
    // Update existing user's password
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
      password,
      user_metadata: { role: 'athlete' },
    })
    if (updateError) {
      return errorResponse('PASSWORD_UPDATE_FAILED', updateError.message, 500)
    }
    userId = updatedUser.id
  } else {
    // Create new user
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true,
      user_metadata: { role: 'athlete' },
    })
    if (createError) {
      return errorResponse('USER_CREATION_FAILED', createError.message, 500)
    }
    userId = authUser.id
  }

  // 3. Mark invitation as accepted
  const { error: updateInviteError } = await supabaseAdmin
    .from('invitations')
    .update({ status: 'accepted', used_at: new Date().toISOString() })
    .eq('token', token)

  if (updateInviteError) {
    // Non-fatal: user was created/updated, but mark invitation failed
    console.error('Failed to update invitation status:', updateInviteError.message)
  }

  return jsonResponse({ success: true, user_id: userId })
})