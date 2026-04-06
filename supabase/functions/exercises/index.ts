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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
  return data?.role === 'admin'
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
  // Strip function path prefix — e.g. /functions/v1/exercises[/...] or /exercises[/...]
  const cleanPath = url.pathname
    .replace(/^\/functions\/v1\/exercises\/?/, '')
    .replace(/^\/exercises\/?/, '')
  const pathParts = cleanPath.split('/').filter(Boolean)

  // Route: /categories — GET list
  if (pathParts[0] === 'categories') {
    if (req.method !== 'GET') {
      return errorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} not allowed`, 405)
    }
    try {
      const { data, error } = await supabase.from('categories').select('*').order('name')
      if (error) throw error
      return jsonResponse(data ?? [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error'
      return errorResponse('INTERNAL_ERROR', message, 500, err)
    }
  }

  // Route: /equipment — GET list
  if (pathParts[0] === 'equipment') {
    if (req.method !== 'GET') {
      return errorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} not allowed`, 405)
    }
    try {
      const { data, error } = await supabase.from('equipment').select('*').order('name')
      if (error) throw error
      return jsonResponse(data ?? [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error'
      return errorResponse('INTERNAL_ERROR', message, 500, err)
    }
  }

  // Exercise routes
  const exerciseId = pathParts[0] ?? null

  try {
    if (!exerciseId) {
      // Collection routes: GET /exercises, POST /exercises
      if (req.method === 'GET') {
        const searchParams = url.searchParams
        const q = searchParams.get('q')
        const categoryId = searchParams.get('category_id')
        const movementType = searchParams.get('movement_type')
        const page = parseInt(searchParams.get('page') ?? '1', 10)
        const pageSize = 20
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        let query = supabase
          .from('exercises')
          .select('*', { count: 'exact' })
          .order('name')
          .range(from, to)

        if (q) {
          query = query.ilike('name', `%${q}%`)
        }
        if (categoryId) {
          query = query.eq('category_id', categoryId)
        }
        if (movementType) {
          query = query.eq('movement_type', movementType)
        }

        const { data, error, count } = await query
        if (error) throw error

        return jsonResponse({
          data: data ?? [],
          total: count ?? 0,
          page,
          pageSize,
        })
      }

      if (req.method === 'POST') {
        // Admin only
        if (!(await isAdmin(supabase, user.id))) {
          return errorResponse('FORBIDDEN', 'Admin access required', 403)
        }

        const body = (await req.json()) as {
          name: string
          description?: string | null
          category_id?: string | null
          movement_type: string
          measurement_type: string
          difficulty_level: string
          equipment?: string[]
          is_benchmark?: boolean
          video_url?: string | null
          scaling_options?: string | null
        }

        const { data, error } = await supabase.from('exercises').insert(body).select().single()

        if (error) {
          // Unique constraint violation
          if (error.code === '23505') {
            return errorResponse(
              'DUPLICATE_NAME',
              `An exercise with the name "${body.name}" already exists`,
              409,
              { field: 'name' },
            )
          }
          throw error
        }

        return jsonResponse(data, 201)
      }

      return errorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} not allowed`, 405)
    }

    // Item routes: GET /exercises/:id, PUT /exercises/:id, DELETE /exercises/:id
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', exerciseId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return errorResponse('NOT_FOUND', 'Exercise not found', 404)
        }
        throw error
      }

      return jsonResponse(data)
    }

    if (req.method === 'PUT') {
      // Admin only
      if (!(await isAdmin(supabase, user.id))) {
        return errorResponse('FORBIDDEN', 'Admin access required', 403)
      }

      const body = (await req.json()) as {
        name?: string
        description?: string | null
        category_id?: string | null
        movement_type?: string
        measurement_type?: string
        difficulty_level?: string
        equipment?: string[]
        is_benchmark?: boolean
        video_url?: string | null
        scaling_options?: string | null
      }

      const { data, error } = await supabase
        .from('exercises')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', exerciseId)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return errorResponse('NOT_FOUND', 'Exercise not found', 404)
        }
        if (error.code === '23505') {
          return errorResponse('DUPLICATE_NAME', 'An exercise with that name already exists', 409, {
            field: 'name',
          })
        }
        throw error
      }

      return jsonResponse(data)
    }

    if (req.method === 'DELETE') {
      // Admin only
      if (!(await isAdmin(supabase, user.id))) {
        return errorResponse('FORBIDDEN', 'Admin access required', 403)
      }

      const { error } = await supabase.from('exercises').delete().eq('id', exerciseId)

      if (error) throw error
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    return errorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} not allowed`, 405)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse('INTERNAL_ERROR', message, 500, err)
  }
})
