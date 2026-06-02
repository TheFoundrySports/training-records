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

async function isAdmin(supabase: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  return (data?.role as string) === 'admin'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} not allowed`, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return errorResponse('UNAUTHORIZED', 'Missing auth token', 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

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

  const callerIsAdmin = await isAdmin(supabaseAdmin, user.id)
  if (!callerIsAdmin) {
    return errorResponse('FORBIDDEN', 'Admin only', 403)
  }

  let email: string
  try {
    const body = (await req.json()) as { email?: string }
    email = (body.email ?? '').trim().toLowerCase()
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  if (!email) {
    return errorResponse('BAD_REQUEST', 'email is required', 400)
  }

  const { data: existing } = await supabaseAdmin
    .from('invitations')
    .select('id')
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return errorResponse('INVITE_EXISTS', 'A pending invitation already exists for this email', 400)
  }

  const { data: settings } = await supabaseAdmin
    .from('app_settings')
    .select('invite_expiry_hours')
    .single()

  const expiryHours = settings?.invite_expiry_hours ?? 48
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + expiryHours)

  const appUrl = Deno.env.get('APP_URL')
  if (!appUrl) {
    return errorResponse('MISSING_APP_URL', 'APP_URL environment variable is required', 500)
  }

  const redirectTo = `${appUrl}/accept-invite`

  const { data: authUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo,
      data: { role: 'athlete' },
    },
  )

  if (inviteError) {
    if (
      inviteError.message.includes('already been registered') ||
      inviteError.message.includes('already exists')
    ) {
      return errorResponse('EMAIL_ALREADY_EXISTS', 'A user with this email already exists', 409)
    }
    return errorResponse('INVITE_FAILED', inviteError.message, 500)
  }

  const token = crypto.randomUUID()

  const { error: insertError } = await supabaseAdmin.from('invitations').insert({
    email,
    token,
    status: 'pending',
    invited_by: user.id,
    expires_at: expiresAt.toISOString(),
  })

  if (insertError) {
    return errorResponse('INTERNAL_ERROR', 'Invitation sent but failed to save audit record', 500)
  }

  return jsonResponse({
    success: true,
    expires_at: expiresAt.toISOString(),
    user_id: authUser.user?.id,
  })
})
