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

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return errorResponse('UNAUTHORIZED', 'Missing auth token', 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  // Client with user's token to verify identity
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
  let email: string
  try {
    const body = (await req.json()) as { email?: string }
    email = body.email ?? ''
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  if (!email) {
    return errorResponse('BAD_REQUEST', 'email is required', 400)
  }

  // Check for existing pending invite
  const { data: existing } = await supabaseAdmin
    .from('invitations')
    .select('id')
    .eq('email', email)
    .eq('status', 'pending')
    .single()

  if (existing) {
    return errorResponse('INVITE_EXISTS', 'A pending invitation already exists for this email', 400)
  }

  // Read invite_expiry_hours from app_settings
  const { data: settings, error: settingsError } = await supabaseAdmin
    .from('app_settings')
    .select('invite_expiry_hours')
    .single()

  const expiryHours = settings?.invite_expiry_hours ?? 48

  // Calculate expiry
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + expiryHours)

  // Generate UUID v4 token
  const token = crypto.randomUUID()

  // Create invitation record
  const { data: invitation, error: insertError } = await supabaseAdmin
    .from('invitations')
    .insert({
      email,
      token,
      status: 'pending',
      invited_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select('token, expires_at')
    .single()

  if (insertError) {
    return errorResponse('INTERNAL_ERROR', 'Failed to create invitation', 500)
  }

  // Build invite URL
  const appUrl = Deno.env.get('APP_URL') ?? `https://${supabaseUrl.replace('.supabase.co', '')}`
  const inviteUrl = `${appUrl}/accept-invite?token=${token}`

  return jsonResponse({
    success: true,
    invite_url: inviteUrl,
    token: invitation!.token,
    expires_at: invitation!.expires_at,
  })
})