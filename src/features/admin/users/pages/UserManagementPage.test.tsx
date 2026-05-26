import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { UserManagementPage } from '../pages/UserManagementPage'

// ── Mutable state for dynamic mocking ─────────────────────────────────────

let isLoadingState = false

// ── Mock hooks ─────────────────────────────────────────────────────────────

vi.mock('../hooks/useUsers', () => {
  return {
    useUsers: () => ({
      data: isLoadingState
        ? null
        : [
            { id: 'u1', email: 'alice@example.com', role: 'admin' as const },
            { id: 'u2', email: 'bob@example.com', role: 'athlete' as const },
          ],
      isLoading: isLoadingState,
      error: null,
    }),
  }
})

const mockUpdateRole = vi.fn()
vi.mock('../hooks/useUpdateUserRole', () => {
  return {
    useUpdateUserRole: () => ({
      updateRole: mockUpdateRole,
      isPending: false,
      isSuccess: false,
      mutationError: null,
    }),
  }
})

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
    <MemoryRouter initialEntries={['/admin/users']}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/admin/users" element={<UserManagementPage />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
    { wrapper: makeWrapper(queryClient) },
  )
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('UserManagementPage', () => {
  beforeEach(() => {
    isLoadingState = false
    mockUpdateRole.mockClear()
  })

  it('renders a table with email and role columns', async () => {
    renderPage()

    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
  })

  it('renders role dropdown for each user row', async () => {
    renderPage()

    const selects = screen.getAllByRole('combobox')
    expect(selects).toHaveLength(2)
  })

  it('shows loading state when isLoading is true', async () => {
    isLoadingState = true
    renderPage()

    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})