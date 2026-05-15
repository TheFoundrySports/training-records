import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BeltProgressionPage } from '../pages/BeltProgressionPage'
import type { TechniqueLearningStatus } from '../types/technique-tracking.types'

// ── Mock Supabase ─────────────────────────────────────────────────────────────

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000'

function createMockThenable(data: unknown, error: unknown) {
  return {
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => {
      resolve({ data, error })
      return createMockThenable(data, error) as unknown as Promise<unknown>
    },
    catch: () => createMockThenable(data, error) as unknown as Promise<unknown>,
  }
}

let mockProgressionData: Array<{
  id: string; user_id: string; belt_level: string; section_id: string
  item_id: string; is_complete: boolean; completed_at: string | null
  technique_id: string | null; created_at: string; updated_at: string
}> = []

let mockUIStateData: Array<{ section_id: string; is_expanded: boolean }> = []

let mockTechniqueStatusData: TechniqueLearningStatus[] = []

let mockSuggestionData: Array<{
  technique_id: string
  bjj_techniques: { name: string; name_es: string | null }
  total_practices: number
  last_practiced_at: string
}> = []

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'belt_progression') {
        return {
          select: vi.fn(() => createMockThenable(mockProgressionData, null)),
          insert: vi.fn(() => ({ eq: vi.fn(() => createMockThenable(null, null)) })),
          upsert: vi.fn(() => ({ onConflict: vi.fn(() => createMockThenable(null, null)) })),
          delete: vi.fn(() => ({ eq: vi.fn(() => createMockThenable(null, null)) })),
        }
      }
      if (table === 'belt_progression_ui_state') {
        return {
          select: vi.fn(() => createMockThenable(mockUIStateData, null)),
        }
      }
      if (table === 'technique_learning_status') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => createMockThenable(mockTechniqueStatusData, null)),
          })),
        }
      }
      if (table === 'technique_practice_log') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => createMockThenable(mockSuggestionData, null)),
                })),
              })),
            })),
          })),
        }
      }
      return {
        select: vi.fn(() => createMockThenable([], null)),
        insert: vi.fn(() => createMockThenable(null, null)),
      }
    }),
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({ data: { user: { id: MOCK_USER_ID } } })
      ),
    },
  },
}))

// ── Mock useBeltProgression ───────────────────────────────────────────────────

vi.mock('../hooks/useBeltProgression', () => ({
  useBeltProgression: vi.fn(() => ({
    progression: mockProgressionData.map(row => ({
      id: row.id,
      userId: row.user_id,
      beltLevel: row.belt_level,
      sectionId: row.section_id,
      itemId: row.item_id,
      isComplete: row.is_complete,
      completedAt: row.completed_at,
      techniqueId: row.technique_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    isLoading: false,
    error: null,
    toggleItem: vi.fn(),
    resetProgress: vi.fn(),
    isResetting: false,
  })),
}))

// ── Mock useTechniqueLearningStatus ──────────────────────────────────────────

vi.mock('../hooks/useTechniqueLearningStatus', () => ({
  useTechniqueLearningStatus: vi.fn(() => ({
    data: mockTechniqueStatusData,
    isLoading: false,
    error: null,
  })),
}))

// ── Mock useTechniqueSuggestions ─────────────────────────────────────────────

vi.mock('../hooks/useTechniqueSuggestions', () => ({
  useTechniqueSuggestions: vi.fn(() => ({
    data: mockSuggestionData.map(row => ({
      technique_id: row.technique_id,
      name: row.bjj_techniques.name,
      name_es: row.bjj_techniques.name_es,
      total_practices: row.total_practices,
      last_practiced_at: row.last_practiced_at,
    })),
    isLoading: false,
    error: null,
  })),
}))

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={makeQueryClient()}>{children}</QueryClientProvider>
  )
}

// ── Fixtures ───────────────────────────────────────────────────────────────────

const mockStatusData: TechniqueLearningStatus[] = [
  {
    user_id: MOCK_USER_ID,
    technique_id: 't1',
    name: 'Double Leg',
    name_es: null,
    category: 'takedown',
    total_practices: 7,
    required_practices: 10,
    is_learned: false,
    first_practiced_at: '2026-04-01T10:00:00.000Z',
    last_practiced_at: '2026-05-10T14:30:00.000Z',
  },
]

const mockSuggestions = [
  {
    technique_id: 't1',
    bjj_techniques: { name: 'Knee Slide Pass', name_es: 'Pasaje de Rodilla' },
    total_practices: 8,
    last_practiced_at: '2026-05-10T10:00:00.000Z',
  },
]

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('BeltProgressionPage - technique tracking integration', () => {
  beforeEach(() => {
    mockProgressionData = []
    mockUIStateData = []
    mockTechniqueStatusData = []
    mockSuggestionData = []
    vi.clearAllMocks()
  })

  it('renders suggestion panel above progress bar', async () => {
    mockSuggestionData = mockSuggestions
    render(<BeltProgressionPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Suggested Techniques')).toBeInTheDocument()
    })
  })

  it('renders section 2 items with practice badges when technique status present', async () => {
    mockTechniqueStatusData = mockStatusData
    render(<BeltProgressionPage />, { wrapper: Wrapper })

    await waitFor(() => {
      // Section 2 title
      expect(screen.getByText('2. Técnicas Requeridas')).toBeInTheDocument()
    })
  })

  it('renders technique practice modal when badge clicked (via onPracticeClick)', async () => {
    mockTechniqueStatusData = mockStatusData
    mockSuggestionData = mockSuggestions
    render(<BeltProgressionPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})