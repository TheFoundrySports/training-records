import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function errorResponse(code: string, message: string, status: number, details: unknown = {}) {
  return new Response(
    JSON.stringify({ error: { code, message, details } }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
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
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return errorResponse('UNAUTHORIZED', 'Invalid or expired token', 401)
  }

  const url = new URL(req.url)
  // Path after /workouts — e.g. "" or "/:id"
  const pathParts = url.pathname.replace(/^\/functions\/v1\/workouts\/?/, '').split('/').filter(Boolean)
  const workoutId = pathParts[0] ?? null

  try {
    if (!workoutId) {
      // Collection routes: GET /workouts, POST /workouts
      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('workouts')
          .select('*')
          .order('performed_at', { ascending: false })

        if (error) throw error
        return jsonResponse(data ?? [])
      }

      if (req.method === 'POST') {
        const body = await req.json() as {
          title: string
          type: string
          performed_at: string
          duration_minutes: number
          notes?: string | null
          rpe?: number | null
        }

        const { data, error } = await supabase
          .from('workouts')
          .insert({ ...body, user_id: user.id })
          .select()
          .single()

        if (error) throw error
        return jsonResponse(data, 201)
      }

      return errorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} not allowed`, 405)
    }

    // Item routes: GET /workouts/:id, PUT /workouts/:id, DELETE /workouts/:id
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', workoutId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return errorResponse('NOT_FOUND', 'Workout not found', 404)
        throw error
      }
      return jsonResponse(data)
    }

    if (req.method === 'PUT') {
      const body = await req.json() as {
        title?: string
        type?: string
        performed_at?: string
        duration_minutes?: number
        notes?: string | null
        rpe?: number | null
      }

      const { data, error } = await supabase
        .from('workouts')
        .update(body)
        .eq('id', workoutId)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') return errorResponse('NOT_FOUND', 'Workout not found', 404)
        throw error
      }
      return jsonResponse(data)
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId)

      if (error) throw error
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    return errorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} not allowed`, 405)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse('INTERNAL_ERROR', message, 500, err)
  }
})
