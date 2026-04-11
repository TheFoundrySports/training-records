import type { PublicWod } from '../public-wod.types'

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

export function mapPublicWodRow(row: PublicWodRow): PublicWod {
  return {
    id: row.id,
    title: row.title,
    type: row.type as PublicWod['type'],
    durationMinutes: row.duration_minutes,
    wodFormat: row.wod_format as PublicWod['wodFormat'],
    wodText: row.wod_text,
    payload: row.payload,
    category: row.category as PublicWod['category'],
    createdAt: row.created_at,
  }
}
