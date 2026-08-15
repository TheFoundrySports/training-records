import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useUpdateBJJWorkout } from '../useUpdateBJJWorkout'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  },
}))

import { supabase } from '@/lib/supabase'

const mockRpc = vi.mocked(supabase.rpc)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useUpdateBJJWorkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls bjj_update_workout RPC with correct payload', async () => {
    // Mock technique name lookup
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [
            { id: 'tech-1', name: 'Arm Bar' },
            { id: 'tech-2', name: 'Kimura' },
          ],
          error: null,
        }),
      }),
    } as unknown as ReturnType<typeof supabase.from>)
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
      success: true,
    })

    const { result } = renderHook(() => useUpdateBJJWorkout(), {
      wrapper: createWrapper(),
    })

    const payload = {
      workoutId: 'workout-123',
      title: 'Edited BJJ Session',
      performedAt: '2026-05-01T10:00:00.000Z',
      durationMin: 90,
      notes: 'Updated notes',
      rpe: 8,
      sections: [
        {
          id: 'section-1',
          goal: 'Guard retention',
          orderIndex: 0,
          techniqueIds: ['tech-1', 'tech-2'],
        },
        {
          goal: 'Pass guard',
          orderIndex: 1,
          techniqueIds: [],
        },
      ],
    }

    await result.current.mutateAsync(payload)

    expect(mockRpc).toHaveBeenCalledTimes(1)
    expect(mockRpc).toHaveBeenCalledWith('bjj_update_workout', {
      p_workout_id: 'workout-123',
      p_title: 'Edited BJJ Session',
      p_performed_at: '2026-05-01T10:00:00.000Z',
      p_duration_min: 90,
      p_notes: 'Updated notes',
      p_rpe: 8,
      p_sections: [
        {
          id: 'section-1',
          section_number: 0,
          goal: 'Guard retention',
          raw_description: null,
          duration_minutes: null,
          technique_names: ['Arm Bar', 'Kimura'],
          enhanced_notes: null,
        },
        {
          id: null,
          section_number: 1,
          goal: 'Pass guard',
          raw_description: null,
          duration_minutes: null,
          technique_names: [],
          enhanced_notes: null,
        },
      ],
    })
  })

  it('invalidates cache on success', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    } as unknown as ReturnType<typeof supabase.from>)
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
      success: true,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateBJJWorkout(), {
      wrapper: function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(QueryClientProvider, { client: queryClient }, children)
      },
    })

    await result.current.mutateAsync({
      workoutId: 'workout-123',
      title: 'Test',
      performedAt: '2026-05-01T10:00:00.000Z',
      durationMin: 60,
      notes: '',
      rpe: undefined,
      sections: [],
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledTimes(2)
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['workout', 'workout-123'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['bjj-sections', 'workout-123'] })
  })

  it('surfaces error on RPC failure', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    } as unknown as ReturnType<typeof supabase.from>)
    const rpcError = {
      message: 'Unauthorized',
      code: 'UNAUTHORIZED',
      details: '',
      hint: '',
      name: 'PostgrestError',
      toJSON: () => ({
        name: 'PostgrestError',
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
        details: '',
        hint: '',
      }),
    }
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: rpcError,
      count: null,
      status: 401,
      statusText: 'Unauthorized',
      success: false,
    })

    const { result } = renderHook(() => useUpdateBJJWorkout(), {
      wrapper: createWrapper(),
    })

    const payload = {
      workoutId: 'workout-123',
      title: 'Test',
      performedAt: '2026-05-01T10:00:00.000Z',
      durationMin: 60,
      notes: '',
      rpe: undefined,
      sections: [],
    }

    await expect(result.current.mutateAsync(payload)).rejects.toEqual(rpcError)
  })
})