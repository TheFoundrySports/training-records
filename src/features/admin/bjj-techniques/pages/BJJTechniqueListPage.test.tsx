import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { BJJTechniqueListPage } from '../pages/BJJTechniqueListPage'
import type { BJJTechnique } from '@/features/bjj/bjj.types'

// ── Mock hooks ─────────────────────────────────────────────────────────────

const MOCK_TECHNIQUES: BJJTechnique[] = [
  {
    id: 't1',
    name: 'Armbar',
    category: 'submission',
    youtubeUrl: 'https://youtube.com/watch?v=abc',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 't2',
    name: 'Knee Pass',
    category: 'guard_pass',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

vi.mock('@/features/bjj/hooks/useBJJTechniques', () => ({
  useBJJTechniques: () => ({
    data: MOCK_TECHNIQUES,
    isLoading: false,
    error: null,
  }),
}))

const mockDelete = vi.fn().mockResolvedValue(undefined)
vi.mock('../hooks/useBJJTechniqueMutations', () => ({
  useDeleteBJJTechnique: () => ({
    mutateAsync: mockDelete,
    isPending: false,
  }),
}))

// ── Helpers ────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function renderPage() {
  const queryClient = makeQueryClient()
  return render(
    <MemoryRouter initialEntries={['/admin/bjj-techniques']}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/admin/bjj-techniques" element={<BJJTechniqueListPage />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
    { wrapper: makeWrapper(queryClient) },
  )
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('BJJTechniqueListPage', () => {
  beforeEach(() => {
    mockDelete.mockClear()
  })

  it('renders technique table with name and category columns', async () => {
    renderPage()

    expect(screen.getByText('Armbar')).toBeInTheDocument()
    expect(screen.getByText('Knee Pass')).toBeInTheDocument()
  })

  it('wraps table in overflow-x-auto for horizontal scroll on mobile', async () => {
    renderPage()

    const wrapper = document.querySelector('.overflow-x-auto')
    expect(wrapper).toBeInTheDocument()
  })
})
