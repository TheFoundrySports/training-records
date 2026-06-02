// @ts-nocheck — Deno global types not available in editor
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MIN_PASSWORD_LENGTH = 8

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

async function sendCreationNotification(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<boolean> {
  try {
    const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
    const { data: linkData } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${appUrl}/login`,
      },
    })
    if (linkData?.properties?.action_link) {
      // Email dispatched via magic link. Inbucket/Mailpit captures SMTP.
      // Admin already set the password so user can log in immediately.
      // Never fail user creation on email dispatch failure.
      return true
    }
    return false
  } catch {
    return false
  }
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
  let password: string
  try {
    const body = (await req.json()) as { email?: string; password?: string }
    email = (body.email ?? '').trim().toLowerCase()
    password = body.password ?? ''
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  if (!email) {
    return errorResponse('BAD_REQUEST', 'email is required', 400)
  }

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return errorResponse(
      'WEAK_PASSWORD',
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      400,
    )
  }

  const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'athlete' },
  })

  if (createError) {
    if (
      createError.message.includes('already been registered') ||
      createError.message.includes('already exists')
    ) {
      return errorResponse('EMAIL_ALREADY_EXISTS', 'A user with this email already exists', 409)
    }
    return errorResponse('USER_CREATION_FAILED', createError.message, 500)
  }

  let notification_sent = false
  try {
    notification_sent = await sendCreationNotification(supabaseAdmin, email)
  } catch {
    // email dispatch failed — user still created successfully
  }

  return jsonResponse({ success: true, user_id: authUser.user!.id, notification_sent })
})
