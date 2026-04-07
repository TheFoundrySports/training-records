import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { mapPublicWodRow } from './mapPublicWodRow'
import type { PublicWod, PublicWodFilters } from '../public-wod.types'

function buildQuery(filters?: PublicWodFilters): string {
  const params = new URLSearchParams()
  if (filters?.q) params.set('q', filters.q)
  if (filters?.category) params.set('category', filters.category)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

interface PublicWodRow {
  id: string
  title: string
  type: string
  duration_minutes: number | null
  wod_format: string | null
  wod_text: string | null
  payload: Record<string, unknown> | null
  category: string | null
  created_at: string
}

export function usePublicWods(filters?: PublicWodFilters) {
  return useQuery({
    queryKey: ['public-wods', filters],
    queryFn: async () => {
      const qs = buildQuery(filters)
      const rows = await apiGet<PublicWodRow[]>(`/public-wods${qs}`)
      return rows.map(mapPublicWodRow)
    },
    staleTime: 1000 * 60 * 60, // 1 hour — this data rarely changes
  })
}

export function usePublicWod(id: string) {
  return useQuery({
    queryKey: ['public-wods', id],
    queryFn: async () => {
      const row = await apiGet<PublicWodRow>(`/public-wods/${id}`)
      return mapPublicWodRow(row) satisfies PublicWod
    },
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 60,
  })
}
