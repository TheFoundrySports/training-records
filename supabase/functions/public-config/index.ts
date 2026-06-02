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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return errorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} not allowed`, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  // Use service role key to bypass RLS — this endpoint is public
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: settings, error: settingsError } = await supabase
    .from('app_settings')
    .select('registration_mode')
    .single()

  if (settingsError) {
    if (settingsError.code === 'PGRST116') {
      return errorResponse('NOT_FOUND', 'app_settings not found', 404)
    }
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch settings', 500)
  }

  return jsonResponse({
    registration_mode: settings.registration_mode,
  })
})
