import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { mapTechniqueRow } from './mapRow'

export function useBJJTechniques(options: { search?: string } = {}) {
  return useQuery({
    queryKey: ['bjj-techniques', options.search ?? ''],
    queryFn: async () => {
      let query = supabase
        .from('bjj_techniques')
        .select('id, name, name_es, description, category, youtube_url, created_at, updated_at')
        .order('name')
        .limit(options.search ? 15 : 500)

      if (options.search) {
        query = query.ilike('name', `%${options.search}%`)
      }

      const { data, error } = await query

      if (error) {
        throw {
          error: {
            code: error.code ?? 'UNKNOWN',
            message: error.message,
            details: error.details,
          },
        }
      }

      return (data ?? []).map(mapTechniqueRow)
    },
    staleTime: 60_000,
  })
}
