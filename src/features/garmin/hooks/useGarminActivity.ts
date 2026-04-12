import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { GarminActivity, GarminMetrics } from '../garmin.types'

function mapGarminActivityRow(row: {
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
  time_in_hr_zone: number[]
  created_at: string
  updated_at: string
}): GarminActivity {
  const zones = row.time_in_hr_zone ?? []

  const metrics: GarminMetrics = {
    elapsedTimeSeconds: row.elapsed_time_seconds,
    avgHeartRate: row.avg_heart_rate,
    maxHeartRate: row.max_heart_rate,
    trainingLoad: row.training_load,
    recoveryTimeHours: row.recovery_time_hours,
    calories: row.calories,
    vo2max: row.vo2max,
    hrZone1Seconds: Math.round((zones[0] ?? 0) / 1000),
    hrZone2Seconds: Math.round((zones[1] ?? 0) / 1000),
    hrZone3Seconds: Math.round((zones[2] ?? 0) / 1000),
    hrZone4Seconds: Math.round((zones[3] ?? 0) / 1000),
    hrZone5Seconds: Math.round((zones[4] ?? 0) / 1000),
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
