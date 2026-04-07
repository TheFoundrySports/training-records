import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function errorResponse(code: string, message: string, status: number, details: unknown = {}) {
  return new Response(JSON.stringify({ error: { code, message, details } }), {
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

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return errorResponse('UNAUTHORIZED', 'Missing auth token', 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  })

  // Verify user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return errorResponse('UNAUTHORIZED', 'Invalid or expired token', 401)
  }

  const url = new URL(req.url)
  // Strip function path prefix — e.g. /functions/v1/public-wods[/...] or /public-wods[/...]
  const cleanPath = url.pathname
    .replace(/^\/functions\/v1\/public-wods\/?/, '')
    .replace(/^\/public-wods\/?/, '')
  const pathParts = cleanPath.split('/').filter(Boolean)

  try {
    if (req.method !== 'GET') {
      return errorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} not allowed`, 405)
    }

    // GET /public-wods/:id
    if (pathParts.length > 0) {
      const id = pathParts[0]
      const { data, error } = await supabase.from('public_wods').select('*').eq('id', id).single()

      if (error) {
        if (error.code === 'PGRST116') {
          return errorResponse('NOT_FOUND', 'Public WOD not found', 404)
        }
        throw error
      }

      return jsonResponse(data)
    }

    // GET /public-wods?q=&category=
    const q = url.searchParams.get('q')
    const category = url.searchParams.get('category')

    let query = supabase
      .from('public_wods')
      .select('*')
      .order('category', { nullsFirst: false })
      .order('title')

    if (q && q.trim().length > 0) {
      query = query.ilike('title', `%${q.trim()}%`)
    }

    if (category && category.trim().length > 0) {
      query = query.eq('category', category.trim())
    }

    const { data, error } = await query
    if (error) throw error

    return jsonResponse(data ?? [])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse('INTERNAL_ERROR', message, 500, err)
  }
})
