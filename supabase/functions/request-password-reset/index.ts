// @ts-nocheck — Deno global types not available in editor
/**
 * request-password-reset Edge Function
 *
 * Handles password reset requests by:
 * 1. Checking if user exists (fails silently to prevent enumeration)
 * 2. Generating a magic link
 * 3. Sending reset email via send-email helper
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

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
  const appUrl = Deno.env.get('APP_URL')

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
    return errorResponse('INTERNAL_ERROR', 'Server configuration error', 500)
  }

  if (!appUrl) {
    console.error('Missing APP_URL environment variable')
    return errorResponse('INTERNAL_ERROR', 'Server configuration error', 500)
  }

  const supabaseAdmin = createSupabaseAdmin(supabaseUrl, serviceRoleKey)

  let email: string
  try {
    const body = (await req.json()) as { email?: string }
    email = body.email ?? ''
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  if (!email || !EMAIL_REGEX.test(email)) {
    return errorResponse('BAD_REQUEST', 'Invalid email address', 400)
  }

  // Normalize email to lowercase for comparison
  const normalizedEmail = email.toLowerCase().trim()

  // Check if user exists (fail silently for security - prevents email enumeration)
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers()
  const user = usersData?.users.find((u) => u.email?.toLowerCase() === normalizedEmail)

  if (!user) {
    // Return success to prevent email enumeration attacks
    // Even if the email doesn't exist, we return success
    return jsonResponse({ success: true })
  }

  // Generate magic link for password reset
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: normalizedEmail,
  })

  if (linkError || !linkData) {
    console.error('Failed to generate magic link:', linkError?.message)
    return errorResponse('INTERNAL_ERROR', 'Failed to generate reset link', 500)
  }

  // Build reset URL with the hashed token
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(linkData.properties.hashed_token)}`
  const emailHtml = `
    <h1>Password Reset Request</h1>
    <p>You requested a password reset. Click the link below to set a new password:</p>
    <p><a href="${resetUrl}">Reset Password</a></p>
    <p>This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
  `

  // Send email via send-email helper
  try {
    const sendEmailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        to: normalizedEmail,
        subject: 'Password Reset Instructions',
        html: emailHtml,
      }),
    })

    if (!sendEmailResponse.ok) {
      const errorBody = await sendEmailResponse.text()
      console.error('send-email function returned error:', errorBody)
      return errorResponse('INTERNAL_ERROR', 'Failed to send reset email', 500)
    }
  } catch (emailError) {
    console.error('Failed to send email:', emailError)
    return errorResponse('INTERNAL_ERROR', 'Failed to send reset email', 500)
  }

  return jsonResponse({ success: true })
}

// Only start server if this is the main module
if (typeof Deno !== 'undefined' && Deno.serve) {
  Deno.serve(async (req) => {
    return handler(req)
  })
}
