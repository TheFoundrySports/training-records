import { useCallback, useMemo, useState } from 'react'
import { bjjWorkoutSchema, type BJJWorkoutFormValues } from '../bjj.schema'

export const BJJ_WORKOUT_DRAFT_VERSION = 1

export interface BJJWorkoutDraftEnvelope {
  version: number
  savedAt: string
  values: BJJWorkoutFormValues
}

export function getBJJWorkoutDraftKey(userId: string): string {
  return `bjj-workout-draft:${userId}`
}

function getStorage(storage?: Storage): Storage | null {
  if (storage) return storage
  if (typeof window === 'undefined' || !window.localStorage) return null
  return window.localStorage
}

export function readBJJWorkoutDraft(
  userId: string,
  storage?: Storage,
): BJJWorkoutDraftEnvelope | null {
  const store = getStorage(storage)
  if (!store || !userId) return null

  try {
    const raw = store.getItem(getBJJWorkoutDraftKey(userId))
    if (!raw) return null

    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed !== 'object' ||
      parsed == null ||
      !('values' in parsed) ||
      !('savedAt' in parsed)
    ) {
      return null
    }

    const envelope = parsed as BJJWorkoutDraftEnvelope
    const result = bjjWorkoutSchema.safeParse(envelope.values)
    if (!result.success) return null

    return {
      version: envelope.version ?? BJJ_WORKOUT_DRAFT_VERSION,
      savedAt: envelope.savedAt,
      values: result.data,
    }
  } catch {
    return null
  }
}

export function writeBJJWorkoutDraft(
  userId: string,
  values: BJJWorkoutFormValues,
  storage?: Storage,
): boolean {
  const store = getStorage(storage)
  if (!store || !userId) return false

  const result = bjjWorkoutSchema.safeParse(values)
  if (!result.success) return false

  try {
    const envelope: BJJWorkoutDraftEnvelope = {
      version: BJJ_WORKOUT_DRAFT_VERSION,
      savedAt: new Date().toISOString(),
      values: result.data,
    }
    store.setItem(getBJJWorkoutDraftKey(userId), JSON.stringify(envelope))
    return true
  } catch {
    return false
  }
}

export function clearBJJWorkoutDraft(userId: string, storage?: Storage): void {
  const store = getStorage(storage)
  if (!store || !userId) return

  try {
    store.removeItem(getBJJWorkoutDraftKey(userId))
  } catch {
    // Ignore quota / private mode errors.
  }
}

interface UseBJJWorkoutDraftOptions {
  userId?: string
  enabled: boolean
  getValues: () => BJJWorkoutFormValues
  reset: (values: BJJWorkoutFormValues) => void
}

export function useBJJWorkoutDraft({
  userId,
  enabled,
  getValues,
  reset,
}: UseBJJWorkoutDraftOptions) {
  const [restorePromptAcknowledged, setRestorePromptAcknowledged] = useState(false)
  const [draftFeedback, setDraftFeedback] = useState<string | null>(null)

  const pendingRestore = useMemo(() => {
    if (!enabled || !userId || restorePromptAcknowledged) return null
    return readBJJWorkoutDraft(userId)
  }, [enabled, restorePromptAcknowledged, userId])

  const restoreDraft = useCallback(() => {
    if (!pendingRestore) return
    reset(pendingRestore.values)
    setRestorePromptAcknowledged(true)
    setDraftFeedback('Draft restored — review before saving.')
  }, [pendingRestore, reset])

  const discardDraft = useCallback(() => {
    if (!userId) return
    clearBJJWorkoutDraft(userId)
    setRestorePromptAcknowledged(true)
    setDraftFeedback('Saved draft discarded.')
  }, [userId])

  const saveDraft = useCallback(() => {
    if (!userId) {
      setDraftFeedback('Sign in to save a draft on this device.')
      return false
    }

    const saved = writeBJJWorkoutDraft(userId, getValues())
    if (saved) {
      setRestorePromptAcknowledged(true)
    }
    setDraftFeedback(
      saved ? 'Draft saved on this device.' : 'Could not save draft — check your session fields.',
    )
    return saved
  }, [getValues, userId])

  const clearSavedDraft = useCallback(() => {
    if (!userId) return
    clearBJJWorkoutDraft(userId)
    setRestorePromptAcknowledged(true)
  }, [userId])

  return {
    pendingRestore,
    draftFeedback,
    restoreDraft,
    discardDraft,
    saveDraft,
    clearSavedDraft,
  }
}
