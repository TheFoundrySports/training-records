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

/** Marks pending invitation as accepted after the user sets their password client-side. */
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
  if (authError || !user?.email) {
    return errorResponse('UNAUTHORIZED', 'Invalid or expired session', 401)
  }

  const email = user.email.toLowerCase()

  const { data: invitation, error: inviteError } = await supabaseAdmin
    .from('invitations')
    .select('id, status')
    .eq('email', email)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (inviteError) {
    return errorResponse('INTERNAL_ERROR', 'Failed to look up invitation', 500)
  }

  if (!invitation) {
    return jsonResponse({
      success: true,
      marked: false,
      warning: 'No pending invitation found for this session',
    })
  }

  const { error: updateError } = await supabaseAdmin
    .from('invitations')
    .update({ status: 'accepted', used_at: new Date().toISOString() })
    .eq('id', invitation.id)

  if (updateError) {
    return errorResponse('INTERNAL_ERROR', 'Failed to update invitation', 500)
  }

  return jsonResponse({ success: true, marked: true, invitation_id: invitation.id })
})
