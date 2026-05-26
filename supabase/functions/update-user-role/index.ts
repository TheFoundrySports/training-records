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

  // Service-role client bypasses RLS for writes
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
  let userId: string
  let role: string
  try {
    const body = (await req.json()) as { user_id?: string; role?: string }
    userId = body.user_id ?? ''
    role = body.role ?? ''
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  if (!userId) {
    return errorResponse('BAD_REQUEST', 'user_id is required', 400)
  }

  if (role !== 'admin' && role !== 'athlete') {
    return errorResponse('INVALID_ROLE', 'Role must be admin or athlete', 400)
  }

  // Verify target user exists
  const { data: targetUser, error: targetError } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (targetError || !targetUser) {
    return errorResponse('USER_NOT_FOUND', 'Target user not found', 404)
  }

  // Step 1: Update profiles.role
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (profileError) {
    return errorResponse('INTERNAL_ERROR', 'Failed to update profiles.role', 500)
  }

  // Step 2: Update auth.users.user_metadata via Admin API
  const currentMetadata = (targetUser.user?.user_metadata ?? {}) as Record<string, unknown>
  const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    data: { ...currentMetadata, role },
  })

  if (metaError) {
    // Rollback: revert profiles.role
    const currentRole = currentMetadata.role as string | undefined
    await supabaseAdmin
      .from('profiles')
      .update({ role: currentRole ?? 'athlete' })
      .eq('id', userId)

    return errorResponse('INTERNAL_ERROR', 'Failed to update user_metadata, rolled back profiles.role', 500)
  }

  return jsonResponse({ success: true, role })
})