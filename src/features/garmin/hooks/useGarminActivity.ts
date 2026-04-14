import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { GarminActivity, GarminMetrics } from '../garmin.types'

export function mapGarminActivityRow(row: {
  id: string
  workout_id: string
  user_id: string
  file_path: string
  elapsed_time_seconds: number
  avg_heart_rate: number | null
  max_heart_rate: number | null
  training_load: number | null
  recovery_time_hours: number | null
  calories: number | null
  vo2max: number | null
  hr_zone_1_seconds: number
  hr_zone_2_seconds: number
  hr_zone_3_seconds: number
  hr_zone_4_seconds: number
  hr_zone_5_seconds: number
  created_at: string
  updated_at: string
}): GarminActivity {
  const metrics: GarminMetrics = {
    elapsedTimeSeconds: row.elapsed_time_seconds,
    avgHeartRate: row.avg_heart_rate,
    maxHeartRate: row.max_heart_rate,
    trainingLoad: row.training_load,
    recoveryTimeHours: row.recovery_time_hours,
    calories: row.calories,
    vo2max: row.vo2max,
    hrZone1Seconds: row.hr_zone_1_seconds ?? 0,
    hrZone2Seconds: row.hr_zone_2_seconds ?? 0,
    hrZone3Seconds: row.hr_zone_3_seconds ?? 0,
    hrZone4Seconds: row.hr_zone_4_seconds ?? 0,
    hrZone5Seconds: row.hr_zone_5_seconds ?? 0,
  }

  return {
    id: row.id,
    workoutId: row.workout_id,
    userId: row.user_id,
    filePath: row.file_path,
    metrics,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function useGarminActivity(workoutId: string | undefined) {
  return useQuery({
    queryKey: ['garmin_activities', workoutId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('garmin_activities')
        .select('*')
        .eq('workout_id', workoutId!)
        .maybeSingle()

      if (error) {
        throw {
          error: {
            code: error.code ?? 'UNKNOWN',
            message: error.message,
            details: error.details,
          },
        }
      }

      if (!data) return null

      return mapGarminActivityRow(data)
    },
    enabled: Boolean(workoutId),
  })
}
