import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { ProtectedRoute } from './ProtectedRoute'

// Mock AuthContext
vi.mock('./AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from './AuthContext'
const mockUseAuth = vi.mocked(useAuth)

function renderWithRoute() {
  return render(
    <MemoryRouter initialEntries={['/workouts']}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/workouts" element={<div>Protected content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to /login', () => {
    mockUseAuth.mockReturnValue({
      session: null,
      user: null,
      role: null,
      isLoading: false,
    })

    renderWithRoute()

    expect(screen.getByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })

  it('renders protected content for authenticated users', () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: 'mock-token', user: { id: 'u1' } } as ReturnType<typeof useAuth>['session'],
      user: { id: 'u1' } as ReturnType<typeof useAuth>['user'],
      role: 'athlete',
      isLoading: false,
    })

    renderWithRoute()

    expect(screen.getByText('Protected content')).toBeInTheDocument()
    expect(screen.queryByText('Login page')).not.toBeInTheDocument()
  })

  it('shows loading spinner while auth state is loading', () => {
    mockUseAuth.mockReturnValue({
      session: null,
      user: null,
      role: null,
      isLoading: true,
    })

    renderWithRoute()

    // Loading state: neither login page nor protected content visible
    expect(screen.queryByText('Login page')).not.toBeInTheDocument()
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
    // The spinner div is rendered
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })
})
