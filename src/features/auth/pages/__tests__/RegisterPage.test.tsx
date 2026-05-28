import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { RegisterPage } from '../RegisterPage'

// ── Mock hooks ─────────────────────────────────────────────────────────────

const mockRegister = vi.fn()

// State object - passed by reference so updates are visible
const registerState = {
  isLoading: false,
  isSuccess: false,
  isError: false,
  error: null as string | null,
}

vi.mock('@/features/auth/hooks/useRegister', () => ({
  useRegister: () => ({
    register: async (...args: unknown[]) => {
      registerState.isLoading = true
      registerState.isSuccess = false
      registerState.isError = false
      registerState.error = null
      try {
        await mockRegister(...args)
        registerState.isLoading = false
        registerState.isSuccess = true
      } catch (err) {
        registerState.isLoading = false
        registerState.isError = true
        registerState.error = err instanceof Error ? err.message : 'Unknown error'
        throw err
      }
    },
    get isLoading() { return registerState.isLoading },
    get isSuccess() { return registerState.isSuccess },
    get isError() { return registerState.isError },
    get error() { return registerState.error },
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

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset state
    registerState.isLoading = false
    registerState.isSuccess = false
    registerState.isError = false
    registerState.error = null
  })

  it('renders email, password, and confirm password fields', () => {
    const queryClient = makeQueryClient()
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <RegisterPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
  })

  it('renders a submit button', () => {
    const queryClient = makeQueryClient()
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <RegisterPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('shows validation error when passwords do not match', async () => {
    const user = (await import('@testing-library/user-event')).default
    const queryClient = makeQueryClient()
    const { getByLabelText, getByRole } = render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <RegisterPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    await user.type(getByLabelText(/email/i), 'test@example.com')
    await user.type(getByLabelText(/^password$/i), 'password123')
    await user.type(getByLabelText(/confirm password/i), 'differentpassword')
    await user.click(getByRole('button', { name: /create account/i }))

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
  })

  it('calls register with form data on submit', async () => {
    const user = (await import('@testing-library/user-event')).default
    const queryClient = makeQueryClient()
    mockRegister.mockResolvedValueOnce({ success: true })

    const { getByLabelText, getByRole } = render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <RegisterPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    await user.type(getByLabelText(/email/i), 'test@example.com')
    await user.type(getByLabelText(/^password$/i), 'password123')
    await user.type(getByLabelText(/confirm password/i), 'password123')
    await user.click(getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  it('shows invite banner when token is in URL', async () => {
    const queryClient = makeQueryClient()
    render(
      <MemoryRouter initialEntries={['/register?token=abc-123']}>
        <QueryClientProvider client={queryClient}>
          <RegisterPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    await waitFor(() => {
      expect(screen.getByText(/you have been invited/i)).toBeInTheDocument()
    })
  })

  it('shows error message when registration fails', async () => {
    const user = (await import('@testing-library/user-event')).default
    const queryClient = makeQueryClient()
    mockRegister.mockRejectedValueOnce(new Error('Registration by invitation only'))

    const { getByLabelText, getByRole } = render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <RegisterPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    await user.type(getByLabelText(/email/i), 'test@example.com')
    await user.type(getByLabelText(/^password$/i), 'password123')
    await user.type(getByLabelText(/confirm password/i), 'password123')
    await user.click(getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
