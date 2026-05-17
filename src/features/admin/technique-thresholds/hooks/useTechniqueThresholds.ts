import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface TechniqueWithThreshold {
  techniqueId: string
  name: string
  category: string | null
  /** null means no threshold row yet — defaults to 10 at usage site */
  currentThreshold: number | null
}

export interface UpdateThresholdInput {
  techniqueId: string
  requiredPractices: number
}

interface BJJTechniqueRow {
  id: string
  name: string
  category: string | null
  technique_learning_thresholds?: {
    technique_id: string
    required_practices: number
  } | null
}

async function fetchTechniqueThresholds(): Promise<TechniqueWithThreshold[]> {
  const { data, error } = await supabase
    .from('bjj_techniques')
    .select('id, name, category, technique_learning_thresholds(technique_id, required_practices)')
    .order('category', { nullsFirst: false })
    .order('name', { nullsFirst: false })

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data as unknown as BJJTechniqueRow[]) ?? []

  return rows.map((row) => ({
    techniqueId: row.id,
    name: row.name,
    category: row.category,
    currentThreshold: row.technique_learning_thresholds?.required_practices ?? null,
  }))
}

export function useTechniqueThresholds() {
  return useQuery({
    queryKey: ['technique-thresholds'],
    queryFn: fetchTechniqueThresholds,
    staleTime: 60_000,
  })
}