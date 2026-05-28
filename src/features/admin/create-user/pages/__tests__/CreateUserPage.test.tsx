import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { CreateUserPage } from '../CreateUserPage'

// ── Mock hooks ─────────────────────────────────────────────────────────────

const mockCreateUser = vi.fn()
const mockCreateInvite = vi.fn()

vi.mock('@/features/admin/create-user/hooks/useCreateUser', () => ({
  useCreateUser: () => ({
    createUser: (...args: unknown[]) => mockCreateUser(...args),
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
    userId: null,
  }),
}))

vi.mock('@/features/admin/create-user/hooks/useCreateInvite', () => ({
  useCreateInvite: () => ({
    createInvite: (...args: unknown[]) => mockCreateInvite(...args),
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
    inviteUrl: null,
    expiresAt: null,
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

describe('CreateUserPage', () => {
  beforeEach(() => {
    mockCreateUser.mockReset()
    mockCreateInvite.mockReset()
  })

  it('renders email input field', () => {
    const queryClient = makeQueryClient()
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <CreateUserPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('renders Create User and Send Invite buttons', () => {
    const queryClient = makeQueryClient()
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <CreateUserPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send invite/i })).toBeInTheDocument()
  })

  it('calls createUser with email when Create User button is clicked', async () => {
    const user = (await import('@testing-library/user-event')).default
    const queryClient = makeQueryClient()
    mockCreateUser.mockResolvedValueOnce({ success: true, user_id: 'new-user' })

    const { getByLabelText, getByRole } = render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <CreateUserPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    await user.type(getByLabelText(/email/i), 'newuser@example.com')
    await user.click(getByRole('button', { name: /create user/i }))

    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledWith({ email: 'newuser@example.com' })
    })
  })

  it('calls createInvite with email when Send Invite button is clicked', async () => {
    const user = (await import('@testing-library/user-event')).default
    const queryClient = makeQueryClient()
    mockCreateInvite.mockResolvedValueOnce({
      success: true,
      invite_url: 'https://app.example.com/accept-invite?token=abc',
      expires_at: '2026-05-30T00:00:00Z',
    })

    const { getByLabelText, getByRole } = render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <CreateUserPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    await user.type(getByLabelText(/email/i), 'invite@example.com')
    await user.click(getByRole('button', { name: /send invite/i }))

    await waitFor(() => {
      expect(mockCreateInvite).toHaveBeenCalledWith({ email: 'invite@example.com' })
    })
  })

  it('shows success message after createUser succeeds', async () => {
    const user = (await import('@testing-library/user-event')).default
    const queryClient = makeQueryClient()
    mockCreateUser.mockResolvedValueOnce({ success: true, user_id: 'user-123' })

    const { getByLabelText, getByRole, findByText } = render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <CreateUserPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    await user.type(getByLabelText(/email/i), 'test@example.com')
    await user.click(getByRole('button', { name: /create user/i }))

    expect(await findByText(/user created/i)).toBeInTheDocument()
  })

  it('shows invite URL after createInvite succeeds', async () => {
    const user = (await import('@testing-library/user-event')).default
    const queryClient = makeQueryClient()
    mockCreateInvite.mockResolvedValueOnce({
      success: true,
      invite_url: 'https://app.example.com/accept-invite?token=xyz',
      expires_at: '2026-05-30T00:00:00Z',
    })

    const { getByLabelText, getByRole, findByText } = render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <CreateUserPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    await user.type(getByLabelText(/email/i), 'invite@example.com')
    await user.click(getByRole('button', { name: /send invite/i }))

    expect(await findByText(/invite sent/i)).toBeInTheDocument()
  })
})
