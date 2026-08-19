import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { BJJWorkoutFormValues } from '../bjj.schema'
import {
  BJJ_WORKOUT_DRAFT_VERSION,
  clearBJJWorkoutDraft,
  getBJJWorkoutDraftKey,
  readBJJWorkoutDraft,
  useBJJWorkoutDraft,
  writeBJJWorkoutDraft,
} from '../hooks/useBJJWorkoutDraft'

const USER_ID = 'user-abc-123'

const draftValues: BJJWorkoutFormValues = {
  title: 'Draft session',
  performedAt: '2026-08-16T09:30',
  durationMinutes: 60,
  notes: 'Saved locally',
  rpe: 6,
  sections: [
    {
      goal: 'Passing',
      rawDescription: '',
      enhancedNotes: '',
      durationMinutes: 30,
      techniqueIds: [],
      rolls: [],
    },
  ],
}

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('useBJJWorkoutDraft storage helpers', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('uses a user-scoped storage key', () => {
    expect(getBJJWorkoutDraftKey(USER_ID)).toBe(`bjj-workout-draft:${USER_ID}`)
  })

  it('writes and reads a validated draft envelope', () => {
    expect(writeBJJWorkoutDraft(USER_ID, draftValues, localStorageMock)).toBe(true)

    const draft = readBJJWorkoutDraft(USER_ID, localStorageMock)
    expect(draft?.values.title).toBe('Draft session')
    expect(draft?.version).toBe(BJJ_WORKOUT_DRAFT_VERSION)
    expect(draft?.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('returns null for invalid stored payloads', () => {
    localStorageMock.setItem(
      getBJJWorkoutDraftKey(USER_ID),
      JSON.stringify({ savedAt: new Date().toISOString(), values: { title: '' } }),
    )

    expect(readBJJWorkoutDraft(USER_ID, localStorageMock)).toBeNull()
  })

  it('clears a stored draft', () => {
    writeBJJWorkoutDraft(USER_ID, draftValues, localStorageMock)
    clearBJJWorkoutDraft(USER_ID, localStorageMock)
    expect(readBJJWorkoutDraft(USER_ID, localStorageMock)).toBeNull()
  })
})

describe('useBJJWorkoutDraft hook', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('surfaces a pending restore when a draft exists on mount', () => {
    writeBJJWorkoutDraft(USER_ID, draftValues, localStorageMock)
    const reset = vi.fn()
    const getValues = vi.fn(() => draftValues)

    const { result } = renderHook(() =>
      useBJJWorkoutDraft({
        userId: USER_ID,
        enabled: true,
        getValues,
        reset,
      }),
    )

    expect(result.current.pendingRestore?.values.title).toBe('Draft session')
  })

  it('restoreDraft repopulates the form via reset', () => {
    writeBJJWorkoutDraft(USER_ID, draftValues, localStorageMock)
    const reset = vi.fn()
    const getValues = vi.fn(() => draftValues)

    const { result } = renderHook(() =>
      useBJJWorkoutDraft({
        userId: USER_ID,
        enabled: true,
        getValues,
        reset,
      }),
    )

    act(() => {
      result.current.restoreDraft()
    })

    const stored = readBJJWorkoutDraft(USER_ID, localStorageMock)
    expect(reset).toHaveBeenCalledWith(stored?.values)
    expect(result.current.pendingRestore).toBeNull()
  })

  it('discardDraft clears stored draft and dismisses restore prompt', () => {
    writeBJJWorkoutDraft(USER_ID, draftValues, localStorageMock)
    const reset = vi.fn()
    const getValues = vi.fn(() => draftValues)

    const { result } = renderHook(() =>
      useBJJWorkoutDraft({
        userId: USER_ID,
        enabled: true,
        getValues,
        reset,
      }),
    )

    expect(result.current.pendingRestore?.values.title).toBe('Draft session')

    act(() => {
      result.current.discardDraft()
    })

    expect(readBJJWorkoutDraft(USER_ID, localStorageMock)).toBeNull()
    expect(result.current.pendingRestore).toBeNull()
  })

  it('saveDraft persists current form values', () => {
    const reset = vi.fn()
    const getValues = vi.fn(() => draftValues)

    const { result } = renderHook(() =>
      useBJJWorkoutDraft({
        userId: USER_ID,
        enabled: false,
        getValues,
        reset,
      }),
    )

    act(() => {
      expect(result.current.saveDraft()).toBe(true)
    })

    expect(readBJJWorkoutDraft(USER_ID, localStorageMock)?.values.title).toBe('Draft session')
  })
})
