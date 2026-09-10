// @ts-nocheck — Deno global types not available in editor
/**
 * reset-password Edge Function
 *
 * Handles password reset by:
 * 1. Validating password strength
 * 2. Verifying the reset token
 * 3. Updating the user's password
 */

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

// Password strength validation regex
// Requires: 8+ chars, lowercase, uppercase, digit, symbol
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/

function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!PASSWORD_REGEX.test(password)) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters and contain uppercase, number, and symbol',
    }
  }
  return { valid: true }
}

// Create supabase admin client - allows injection for testing
function createSupabaseAdmin(supabaseUrl: string, serviceRoleKey: string) {
  // Allow test injection
  // @ts-ignore
  if (typeof globalThis.__TEST_SUPABASE__ !== 'undefined') {
    // @ts-ignore
    return globalThis.__TEST_SUPABASE__
  }
  return createClient(supabaseUrl, serviceRoleKey)
}

// Handler function for testing - exported as default
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} not allowed`, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
    return errorResponse('INTERNAL_ERROR', 'Server configuration error', 500)
  }

  const supabaseAdmin = createSupabaseAdmin(supabaseUrl, serviceRoleKey)

  let token: string
  let newPassword: string

  try {
    const body = (await req.json()) as { token?: string; new_password?: string }
    token = body.token ?? ''
    newPassword = body.new_password ?? ''
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  if (!token || !newPassword) {
    return errorResponse('BAD_REQUEST', 'token and new_password are required', 400)
  }

  // Validate password strength (same rules as frontend registration)
  const passwordValidation = validatePassword(newPassword)
  if (!passwordValidation.valid) {
    return errorResponse(
      'WEAK_PASSWORD',
      passwordValidation.message ?? 'Password does not meet requirements',
      400,
    )
  }

  // Verify token using magic link verification
  const decodedToken = decodeURIComponent(token)
  const { data: user, error: verifyError } =
    await supabaseAdmin.auth.admin.getUserByLink(decodedToken)

  if (verifyError || !user) {
    console.error('Token verification failed:', verifyError?.message)
    return errorResponse('INVALID_TOKEN', 'Reset link is invalid or has expired', 400)
  }

  // Update password
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: newPassword,
  })

  if (updateError) {
    console.error('Failed to update password:', updateError.message)
    return errorResponse('INTERNAL_ERROR', 'Failed to update password', 500)
  }

  return jsonResponse({ success: true })
}

// Only start server if this is the main module
if (typeof Deno !== 'undefined' && Deno.serve) {
  Deno.serve(async (req) => {
    return handler(req)
  })
}
