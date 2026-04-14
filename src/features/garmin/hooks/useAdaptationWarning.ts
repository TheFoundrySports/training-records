import { addHours, parseISO } from 'date-fns'

const WARNING_MESSAGE =
  'Your next workout is scheduled before your estimated recovery window ends. Consider resting or doing light activity.'

export function useAdaptationWarning(
  recoveryTimeHours: number | null,
  currentWorkoutPerformedAt: string,
  nextWorkoutPerformedAt: string | null,
): string | null {
  if (recoveryTimeHours === null || nextWorkoutPerformedAt === null) {
    return null
  }

  const recoveryEndsAt = addHours(parseISO(currentWorkoutPerformedAt), recoveryTimeHours)
  const nextWorkoutDate = parseISO(nextWorkoutPerformedAt)

  if (nextWorkoutDate < recoveryEndsAt) {
    return WARNING_MESSAGE
  }

  return null
}
