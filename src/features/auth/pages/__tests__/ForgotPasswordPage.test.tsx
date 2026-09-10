import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { ForgotPasswordPage } from '../ForgotPasswordPage'

// ── Mock useForgotPassword ───────────────────────────────────────────────────

const mockRequestReset = vi.fn()

vi.mock('@/features/auth/hooks/useForgotPassword', () => ({
  useForgotPassword: () => ({
    requestReset: mockRequestReset,
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
  }),
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
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

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequestReset.mockReset()
    mockRequestReset.mockResolvedValue({ success: true })
  })

  it('renders email input and submit button', () => {
    const queryClient = makeQueryClient()
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <ForgotPasswordPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
  })

  it('renders page heading', () => {
    const queryClient = makeQueryClient()
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <ForgotPasswordPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    expect(screen.getByRole('heading', { name: /forgot password/i })).toBeInTheDocument()
  })

  it('renders link back to login', () => {
    const queryClient = makeQueryClient()
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <ForgotPasswordPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    expect(screen.getByRole('link', { name: /back to login/i })).toBeInTheDocument()
  })

  it('calls requestReset with email on submit', async () => {
    const user = (await import('@testing-library/user-event')).default
    const queryClient = makeQueryClient()

    const { getByLabelText, getByRole } = render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <ForgotPasswordPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    await user.type(getByLabelText(/email/i), 'test@example.com')
    await user.click(getByRole('button', { name: /send reset link/i }))

    await waitFor(() => {
      expect(mockRequestReset).toHaveBeenCalledWith('test@example.com')
    })
  })

  it('shows descriptive text about password reset', () => {
    const queryClient = makeQueryClient()
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <ForgotPasswordPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    expect(screen.getByText(/we'll send you a link/i)).toBeInTheDocument()
  })
})
