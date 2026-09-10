// @ts-nocheck — Deno global types not available in editor
/**
 * send-email Edge Function
 *
 * Sends emails via Resend API.
 * Used by other edge functions for password reset and notification emails.
 */

import { Resend } from 'resend'

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

// Handler function for testing - exported as default
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} not allowed`, 405)
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured')
    return errorResponse('INTERNAL_ERROR', 'Resend API key not configured', 500)
  }

  let to: string
  let subject: string
  let html: string

  try {
    const body = (await req.json()) as { to?: string; subject?: string; html?: string }
    to = body.to ?? ''
    subject = body.subject ?? ''
    html = body.html ?? ''
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  if (!to || !subject || !html) {
    return errorResponse('BAD_REQUEST', 'to, subject, and html are required', 400)
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(to)) {
    return errorResponse('BAD_REQUEST', 'Invalid email address format', 400)
  }

  try {
    const resend = new Resend(resendApiKey)
    const { error: resendError } = await resend.emails.send({
      from: 'Training Records <noreply@resend.dev>',
      to,
      subject,
      html,
    })

    if (resendError) {
      console.error('Resend API error:', resendError)
      return errorResponse('INTERNAL_ERROR', 'Failed to send email', 500)
    }

    return jsonResponse({ success: true })
  } catch (err) {
    console.error('Email sending error:', err)
    return errorResponse('INTERNAL_ERROR', 'Failed to send email', 500)
  }
}

// Only start server if this is the main module
// This allows the handler to be imported for testing
if (typeof Deno !== 'undefined' && Deno.serve) {
  Deno.serve(async (req) => {
    return handler(req)
  })
}
