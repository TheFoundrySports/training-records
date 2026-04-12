export interface GarminMetrics {
  elapsedTimeSeconds: number
  avgHeartRate: number | null
  maxHeartRate: number | null
  trainingLoad: number | null
  recoveryTimeHours: number | null
  calories: number | null
  vo2max: number | null
  hrZone1Seconds: number
  hrZone2Seconds: number
  hrZone3Seconds: number
  hrZone4Seconds: number
  hrZone5Seconds: number
}

export interface GarminActivity {
  id: string
  workoutId: string
  userId: string
  filePath: string
  metrics: GarminMetrics // flattened from the DB columns
  createdAt: string
  updatedAt: string
}

export interface TrainingEvaluation {
  id: string
  garminActivityId: string
  userId: string
  summary: string
  readinessLevel: 'excellent' | 'good' | 'moderate' | 'low' | 'rest'
  nextSessionSuggestion: string
  adaptationWarning: string | null
  createdAt: string
}

export type ImportResult = {
  garminActivityId: string
  metrics: GarminMetrics
}
