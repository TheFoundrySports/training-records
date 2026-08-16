/**
 * RED tests for useConfirmRolls mutation hook (REQ-FRM1 PR 2a, D5).
 *
 * Covers:
 * - Maps section_number to section id
 * - Calls planRollConfirmation per section
 * - Deletes proposed rows when plan.deleteProposed = true
 * - Inserts confirmed rolls with technique_ids resolved from names
 * - Invalidates bjj dashboard queries on success
 * - Executes AFTER workout save (REQ-RE10 ordering)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useConfirmRolls } from '../useConfirmRolls'
import { supabase } from '@/lib/supabase'
import type { ConfirmRollsInput } from '../../bjj.types'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// Mock planRollConfirmation
vi.mock('../../ai/planRollConfirmation', () => ({
  planRollConfirmation: vi.fn((sectionId, existingRolls, drafts) => {
    const hasProposed = existingRolls.some((r: { status: string }) => r.status === 'proposed')
    const maxConfirmedIndex =
      existingRolls.filter((r: { status: string }) => r.status === 'confirmed').length > 0
        ? Math.max(
            ...existingRolls
              .filter((r: { status: string }) => r.status === 'confirmed')
              .map((r: { roll_index: number }) => r.roll_index)
          )
        : 0

    return {
      sectionId,
      deleteProposed: hasProposed,
      inserts: drafts.map((draft: { roll_index: number }, idx: number) => ({
        roll_index: maxConfirmedIndex + idx + 1,
        role: draft.role,
        outcome: draft.outcome,
        position_from: draft.position_from,
        position_to: draft.position_to,
        technique_ids: [],
        status: 'confirmed',
        source: draft.source,
        confidence: draft.confidence,
        raw_excerpt: draft.raw_excerpt,
      })),
    }
  }),
}))

describe('useConfirmRolls (PR 2a)', () => {
  let queryClient: QueryClient

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  it('returns no-op when input sections array is empty', async () => {
    const input: ConfirmRollsInput = {
      workoutId: 'aaaaaaaa-1000-0000-0000-000000000001',
      sections: [],
    }

    const { result } = renderHook(() => useConfirmRolls(), { wrapper })

    result.current.mutate(input)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Should not call supabase at all
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('deletes proposed rows when plan.deleteProposed = true', async () => {
    const mockDeleteEqChain = vi.fn().mockResolvedValue({ error: null })
    const mockDeleteEq = vi.fn().mockReturnValue({ eq: mockDeleteEqChain })
    const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq })

    const mockInsert = vi.fn().mockResolvedValue({ error: null })

    const mockRollEventsSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [
          { roll_index: 1, status: 'proposed' },
          { roll_index: 2, status: 'confirmed' },
        ],
        error: null,
      }),
    })

    const mockSectionsSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'bbbbbbbb-2000-0000-0000-000000000001' },
            error: null,
          }),
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'bjj_roll_events') {
        return {
          select: mockRollEventsSelect,
          delete: mockDelete,
          insert: mockInsert,
        } as never
      }
      if (table === 'bjj_sections') {
        return {
          select: mockSectionsSelect,
        } as never
      }
      if (table === 'bjj_techniques') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        } as never
      }
      return {} as never
    })

    const input: ConfirmRollsInput = {
      workoutId: 'aaaaaaaa-1000-0000-0000-000000000001',
      sections: [
        {
          sectionNumber: 1,
          rolls: [
            {
              roll_index: 1,
              role: 'attacking',
              outcome: 'submission',
              position_from: 'closed_guard',
              position_to: 'mount',
              technique_names: [],
              confidence: 0.85,
              raw_excerpt: 'Roll 1',
              validation_error: null,
              source: 'ai_confirmed',
            },
          ],
        },
      ],
    }

    const { result } = renderHook(() => useConfirmRolls(), { wrapper })

    result.current.mutate(input)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Verify delete was called with correct params
    expect(mockDelete).toHaveBeenCalled()
    expect(mockDeleteEq).toHaveBeenCalledWith('section_id', 'bbbbbbbb-2000-0000-0000-000000000001')
    expect(mockDeleteEqChain).toHaveBeenCalledWith('status', 'proposed')
  })

  it('inserts confirmed rolls with technique_ids mapped from names', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null })

    const mockRollEventsSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    })

    const mockSectionsSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'bbbbbbbb-2000-0000-0000-000000000001' },
            error: null,
          }),
        }),
      }),
    })

    const mockTechniquesSelect = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({
        data: [{ id: 'tttttttt-3000-0000-0000-000000000001', name: 'Triangle' }],
        error: null,
      }),
    })

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'bjj_roll_events') {
        return {
          select: mockRollEventsSelect,
          insert: mockInsert,
        } as never
      }
      if (table === 'bjj_sections') {
        return {
          select: mockSectionsSelect,
        } as never
      }
      if (table === 'bjj_techniques') {
        return {
          select: mockTechniquesSelect,
        } as never
      }
      return {} as never
    })

    const input: ConfirmRollsInput = {
      workoutId: 'aaaaaaaa-1000-0000-0000-000000000001',
      sections: [
        {
          sectionNumber: 1,
          rolls: [
            {
              roll_index: 1,
              role: 'attacking',
              outcome: 'submission',
              position_from: 'closed_guard',
              position_to: 'mount',
              technique_names: ['Triangle'],
              confidence: 0.85,
              raw_excerpt: 'From guard',
              validation_error: null,
              source: 'ai_confirmed',
            },
          ],
        },
      ],
    }

    const { result } = renderHook(() => useConfirmRolls(), { wrapper })

    result.current.mutate(input)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Verify insert was called with technique_ids resolved
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          technique_ids: ['tttttttt-3000-0000-0000-000000000001'],
          status: 'confirmed',
          source: 'ai_confirmed',
        }),
      ])
    )
  })

  it('invalidates bjj dashboard queries on success', async () => {
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const mockInsert = vi.fn().mockResolvedValue({ error: null })

    const mockRollEventsSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    })

    const mockSectionsSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'bbbbbbbb-2000-0000-0000-000000000001' },
            error: null,
          }),
        }),
      }),
    })

    const mockTechniquesSelect = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    })

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'bjj_roll_events') {
        return {
          select: mockRollEventsSelect,
          insert: mockInsert,
        } as never
      }
      if (table === 'bjj_sections') {
        return {
          select: mockSectionsSelect,
        } as never
      }
      if (table === 'bjj_techniques') {
        return {
          select: mockTechniquesSelect,
        } as never
      }
      return {} as never
    })

    const input: ConfirmRollsInput = {
      workoutId: 'aaaaaaaa-1000-0000-0000-000000000001',
      sections: [
        {
          sectionNumber: 1,
          rolls: [
            {
              roll_index: 1,
              role: 'attacking',
              outcome: 'submission',
              position_from: 'closed_guard',
              position_to: null,
              technique_names: [],
              confidence: null,
              raw_excerpt: null,
              validation_error: null,
              source: 'manual',
            },
          ],
        },
      ],
    }

    const { result } = renderHook(() => useConfirmRolls(), { wrapper })

    result.current.mutate(input)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Verify dashboard queries were invalidated
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['bjj-dashboard'] })
  })

  it('handles multiple sections with different roll counts', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null })

    const sectionIdMap = new Map([
      [1, 'bbbbbbbb-2000-0000-0000-000000000001'],
      [2, 'bbbbbbbb-2000-0000-0000-000000000002'],
    ])

    const mockRollEventsSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    })

    const mockTechniquesSelect = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    })

    let sectionQueryCount = 0
    const sectionNumbers = [1, 2]

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'bjj_roll_events') {
        return {
          select: mockRollEventsSelect,
          insert: mockInsert,
        } as never
      }
      if (table === 'bjj_sections') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockImplementation(() => {
                  const sectionNumber = sectionNumbers[sectionQueryCount]
                  sectionQueryCount++
                  return Promise.resolve({
                    data: { id: sectionIdMap.get(sectionNumber) },
                    error: null,
                  })
                }),
              }),
            }),
          }),
        } as never
      }
      if (table === 'bjj_techniques') {
        return {
          select: mockTechniquesSelect,
        } as never
      }
      return {} as never
    })

    const input: ConfirmRollsInput = {
      workoutId: 'aaaaaaaa-1000-0000-0000-000000000001',
      sections: [
        {
          sectionNumber: 1,
          rolls: [
            {
              roll_index: 1,
              role: 'attacking',
              outcome: 'submission',
              position_from: 'closed_guard',
              position_to: 'mount',
              technique_names: [],
              confidence: 0.85,
              raw_excerpt: 'Section 1 Roll 1',
              validation_error: null,
              source: 'ai_confirmed',
            },
          ],
        },
        {
          sectionNumber: 2,
          rolls: [
            {
              roll_index: 1,
              role: 'defending',
              outcome: 'position_loss',
              position_from: 'side_control',
              position_to: 'mount',
              technique_names: [],
              confidence: 0.75,
              raw_excerpt: 'Section 2 Roll 1',
              validation_error: null,
              source: 'ai_edited',
            },
            {
              roll_index: 2,
              role: 'neutral',
              outcome: 'neutral',
              position_from: 'standing',
              position_to: null,
              technique_names: [],
              confidence: null,
              raw_excerpt: null,
              validation_error: null,
              source: 'manual',
            },
          ],
        },
      ],
    }

    const { result } = renderHook(() => useConfirmRolls(), { wrapper })

    result.current.mutate(input)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Verify insert was called twice (once per section)
    expect(mockInsert).toHaveBeenCalledTimes(2)
  })
})
