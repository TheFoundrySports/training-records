import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { ResetPasswordPage } from '../ResetPasswordPage'

// ── Mock useResetPassword ───────────────────────────────────────────────────

const mockResetPassword = vi.fn()

const resetPasswordState = {
  isLoading: false,
  isSuccess: false,
  isError: false,
  error: null as string | null,
}

vi.mock('@/features/auth/hooks/useResetPassword', () => ({
  useResetPassword: () => ({
    resetPassword: async (...args: unknown[]) => {
      resetPasswordState.isLoading = true
      resetPasswordState.isSuccess = false
      resetPasswordState.isError = false
      resetPasswordState.error = null
      try {
        await mockResetPassword(...args)
        resetPasswordState.isLoading = false
        resetPasswordState.isSuccess = true
      } catch (err) {
        resetPasswordState.isLoading = false
        resetPasswordState.isError = true
        resetPasswordState.error = err instanceof Error ? err.message : 'Unknown error'
      }
    },
    get isLoading() {
      return resetPasswordState.isLoading
    },
    get isSuccess() {
      return resetPasswordState.isSuccess
    },
    get isError() {
      return resetPasswordState.isError
    },
    get error() {
      return resetPasswordState.error
    },
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

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetPasswordState.isLoading = false
    resetPasswordState.isSuccess = false
    resetPasswordState.isError = false
    resetPasswordState.error = null
  })

  it('renders password inputs and submit button when token is present', () => {
    const queryClient = makeQueryClient()
    render(
      <MemoryRouter initialEntries={['/reset-password?token=test-token']}>
        <QueryClientProvider client={queryClient}>
          <ResetPasswordPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    expect(screen.getByLabelText('New Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument()
  })

  it('renders page heading', () => {
    const queryClient = makeQueryClient()
    render(
      <MemoryRouter initialEntries={['/reset-password?token=test-token']}>
        <QueryClientProvider client={queryClient}>
          <ResetPasswordPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument()
  })

  it('shows password requirements checklist', () => {
    const queryClient = makeQueryClient()
    render(
      <MemoryRouter initialEntries={['/reset-password?token=test-token']}>
        <QueryClientProvider client={queryClient}>
          <ResetPasswordPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    expect(screen.getByText(/password must include:/i)).toBeInTheDocument()
    expect(screen.getByText(/8\+ characters/i)).toBeInTheDocument()
    expect(screen.getByText(/uppercase letter/i)).toBeInTheDocument()
    expect(screen.getByText(/number/i)).toBeInTheDocument()
    expect(screen.getByText(/symbol/i)).toBeInTheDocument()
  })

  it('shows validation error when passwords do not match', async () => {
    const user = (await import('@testing-library/user-event')).default
    const queryClient = makeQueryClient()
    const { getByLabelText, getByRole } = render(
      <MemoryRouter initialEntries={['/reset-password?token=test-token']}>
        <QueryClientProvider client={queryClient}>
          <ResetPasswordPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    await user.type(getByLabelText('New Password'), 'Password123!')
    await user.type(getByLabelText('Confirm Password'), 'Different123!')
    await user.click(getByRole('button', { name: /reset password/i }))

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
  })

  it('calls resetPassword with form data on submit', async () => {
    const user = (await import('@testing-library/user-event')).default
    const queryClient = makeQueryClient()
    mockResetPassword.mockResolvedValueOnce({ success: true })

    const { getByLabelText, getByRole } = render(
      <MemoryRouter initialEntries={['/reset-password?token=test-token']}>
        <QueryClientProvider client={queryClient}>
          <ResetPasswordPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    await user.type(getByLabelText('New Password'), 'Password123!')
    await user.type(getByLabelText('Confirm Password'), 'Password123!')
    await user.click(getByRole('button', { name: /reset password/i }))

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith({
        token: 'test-token',
        new_password: 'Password123!',
      })
    })
  })

  it('shows success message after successful reset', async () => {
    const user = (await import('@testing-library/user-event')).default
    const queryClient = makeQueryClient()
    mockResetPassword.mockResolvedValueOnce({ success: true })

    const { getByLabelText, getByRole } = render(
      <MemoryRouter initialEntries={['/reset-password?token=test-token']}>
        <QueryClientProvider client={queryClient}>
          <ResetPasswordPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    await user.type(getByLabelText('New Password'), 'Password123!')
    await user.type(getByLabelText('Confirm Password'), 'Password123!')
    await user.click(getByRole('button', { name: /reset password/i }))

    await waitFor(() => {
      expect(screen.getByText(/password reset successful/i)).toBeInTheDocument()
    })
  })

  it('shows error message when reset fails', async () => {
    const user = (await import('@testing-library/user-event')).default
    const queryClient = makeQueryClient()
    mockResetPassword.mockRejectedValueOnce(new Error('Reset link is invalid or has expired'))

    const { getByLabelText, getByRole } = render(
      <MemoryRouter initialEntries={['/reset-password?token=test-token']}>
        <QueryClientProvider client={queryClient}>
          <ResetPasswordPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    await user.type(getByLabelText('New Password'), 'Password123!')
    await user.type(getByLabelText('Confirm Password'), 'Password123!')
    await user.click(getByRole('button', { name: /reset password/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Reset link is invalid or has expired')
    })
  })

  it('disables button while loading', async () => {
    const user = (await import('@testing-library/user-event')).default
    const queryClient = makeQueryClient()
    mockResetPassword.mockImplementation(() => new Promise(() => {})) // Never resolves

    const { getByLabelText, getByRole } = render(
      <MemoryRouter initialEntries={['/reset-password?token=test-token']}>
        <QueryClientProvider client={queryClient}>
          <ResetPasswordPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    await user.type(getByLabelText('New Password'), 'Password123!')
    await user.type(getByLabelText('Confirm Password'), 'Password123!')
    await user.click(getByRole('button', { name: /reset password/i }))

    expect(getByRole('button', { name: /resetting/i })).toBeDisabled()
  })

  it('shows password strength indicator', async () => {
    const user = (await import('@testing-library/user-event')).default
    const queryClient = makeQueryClient()
    render(
      <MemoryRouter initialEntries={['/reset-password?token=test-token']}>
        <QueryClientProvider client={queryClient}>
          <ResetPasswordPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    const passwordInput = screen.getByLabelText('New Password')
    await user.type(passwordInput, 'Weak')

    // PasswordStrengthMeter should be visible
    expect(screen.getByText(/very weak/i)).toBeInTheDocument()
  })

  it('highlights met requirements in green', async () => {
    const user = (await import('@testing-library/user-event')).default
    const queryClient = makeQueryClient()
    render(
      <MemoryRouter initialEntries={['/reset-password?token=test-token']}>
        <QueryClientProvider client={queryClient}>
          <ResetPasswordPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    const passwordInput = screen.getByLabelText('New Password')
    await user.type(passwordInput, 'Password123!')

    // Requirements that are met should have text-green-600 class
    const greenRequirements = screen.getAllByText((content, element) => {
      if (!element) return false
      return content.includes('✓') && element.classList.contains('text-green-600')
    })
    expect(greenRequirements.length).toBeGreaterThan(0)
  })

  it('shows unmet requirements with circle', async () => {
    const user = (await import('@testing-library/user-event')).default
    const queryClient = makeQueryClient()
    render(
      <MemoryRouter initialEntries={['/reset-password?token=test-token']}>
        <QueryClientProvider client={queryClient}>
          <ResetPasswordPage />
        </QueryClientProvider>
      </MemoryRouter>,
      { wrapper: makeWrapper(queryClient) },
    )

    const passwordInput = screen.getByLabelText('New Password')
    await user.type(passwordInput, 'weak')

    // Check for ○ in the document
    expect(screen.getByText(/○.*8\+ characters/i)).toBeInTheDocument()
  })
})
