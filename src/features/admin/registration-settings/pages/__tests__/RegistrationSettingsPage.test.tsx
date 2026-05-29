import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { RegistrationSettingsPage } from '../RegistrationSettingsPage'

// ── Mock hooks ─────────────────────────────────────────────────────────────

const mockUpdateSettings = vi.fn()
const mockRevokeUser = vi.fn()

vi.mock('@/features/admin/registration-settings/hooks/useRegistrationSettings', () => ({
  useRegistrationSettings: () => ({
    data: {
      registration_mode: 'open',
      invite_expiry_hours: 48,
    },
    isLoading: false,
    isError: false,
    error: null,
  }),
  useUpdateRegistrationSettings: () => ({
    updateSettings: mockUpdateSettings,
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
  }),
}))

vi.mock('@/features/admin/registration-settings/hooks/useInvitations', () => ({
  useInvitations: () => ({
    data: [
      {
        id: 'inv-1',
        email: 'pending@example.com',
        status: 'pending',
        expires_at: '2026-05-30T00:00:00Z',
        invited_by: 'admin-1',
      },
    ],
    isLoading: false,
    isError: false,
  }),
}))

vi.mock('@/features/admin/registration-settings/hooks/useRevokeUser', () => ({
  useRevokeUser: () => ({
    revokeUser: mockRevokeUser,
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
  }),
}))

vi.mock('@/features/admin/users/hooks/useUsers', () => ({
  useUsers: () => ({
    data: [
      { id: 'user-1', email: 'user@example.com', role: 'athlete' },
    ],
    isLoading: false,
    isError: false,
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

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('RegistrationSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders registration mode toggle', () => {
    const queryClient = makeQueryClient()
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <RegistrationSettingsPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    expect(screen.getByText(/open registration/i)).toBeInTheDocument()
    expect(screen.getByText(/invite only/i)).toBeInTheDocument()
  })

  it('renders invitations table with data', () => {
    const queryClient = makeQueryClient()
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <RegistrationSettingsPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    expect(screen.getByText('pending@example.com')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
  })

  it('renders revoke button for pending invitations', () => {
    const queryClient = makeQueryClient()
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <RegistrationSettingsPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    // There are two revoke buttons (invitations and users), check we have them
    const revokeButtons = screen.getAllByRole('button', { name: /revoke/i })
    expect(revokeButtons).toHaveLength(2)
  })

  it('renders users list with ban/unban buttons', () => {
    const queryClient = makeQueryClient()
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <RegistrationSettingsPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    expect(screen.getByText('user@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /revoke access/i })).toBeInTheDocument()
  })

  it('calls updateSettings when toggle is changed', async () => {
    const user = (await import('@testing-library/user-event')).default
    const queryClient = makeQueryClient()
    mockUpdateSettings.mockResolvedValueOnce({ success: true })

    const { getByRole } = render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <RegistrationSettingsPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    const toggle = getByRole('button', { name: /invite only/i })
    await user.click(toggle)

    await vi.waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith({ registration_mode: 'invite_only' })
    })
  })
})
