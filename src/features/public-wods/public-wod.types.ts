export interface PublicWod {
  id: string
  title: string
  type: 'crossfit' | 'functional'
  durationMinutes: number | null
  wodFormat: 'amrap' | 'for_time' | 'emom' | 'tabata' | 'ladder' | 'rft' | null
  wodText: string | null
  payload: Record<string, unknown> | null
  category: 'Hero' | 'Girl' | 'Benchmark' | 'General' | null
  createdAt: string
}

export interface PublicWodFilters {
  q?: string
  category?: string
}

/** Fields pre-filled into WorkoutFormPage when a public WOD is selected */
export interface PublicWodFormFields {
  title: string
  type: 'crossfit' | 'functional'
  wodFormat: PublicWod['wodFormat']
  wodText: string | null
  payload: Record<string, unknown> | null
  durationMinutes: number | null
}
