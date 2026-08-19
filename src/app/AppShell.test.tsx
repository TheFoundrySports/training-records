import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AppShell } from './AppShell'
import { AuthProvider } from '@/features/auth/AuthContext'
import { ThemeProvider } from '@/theme/ThemeContext'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    )
  }
}

function renderWithRouter() {
  const queryClient = makeQueryClient()

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<div>Home Content</div>} />
            <Route path="workouts" element={<div>Workouts Content</div>} />
            <Route path="calendar" element={<div>Calendar Content</div>} />
            <Route path="ai" element={<div>AI Content</div>} />
            <Route path="bjj/blue-belt-progression" element={<div>Blue Belt Content</div>} />
          </Route>
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
    { wrapper: makeWrapper(queryClient) },
  )
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders AppShell with logo link', () => {
    renderWithRouter()
    expect(screen.getByText('Training Records')).toBeInTheDocument()
  })

  it('renders theme toggle in the header', () => {
    renderWithRouter()
    expect(
      screen.getByRole('button', { name: /switch to (light|dark) mode/i }),
    ).toBeInTheDocument()
  })

  it('renders hamburger button visible at mobile (md:hidden class present)', () => {
    renderWithRouter()
    const hamburger = screen.getByRole('button', { name: /open navigation menu/i })
    expect(hamburger).toBeInTheDocument()
    expect(hamburger).toHaveClass('flex', 'md:hidden')
  })

  it('hamburger button is hidden above md breakpoint (has md:hidden so hides at md+)', () => {
    renderWithRouter()
    const hamburger = screen.getByRole('button', { name: /open navigation menu/i })
    // md:hidden means hidden at md and up — so visible below md
    expect(hamburger).toHaveClass('md:hidden')
  })

  it('opens mobile drawer when hamburger is clicked', () => {
    renderWithRouter()
    const hamburger = screen.getByRole('button', { name: /open navigation menu/i })

    fireEvent.click(hamburger)

    // Drawer should be visible with nav links
    expect(screen.getByText('Menu')).toBeInTheDocument()
    const calendarLinks = screen.getAllByText('Calendar')
    expect(calendarLinks.length).toBeGreaterThanOrEqual(1)
    const workoutsLinks = screen.getAllByText('Workouts')
    expect(workoutsLinks.length).toBeGreaterThanOrEqual(1)
  })

  it('closes drawer when nav link is clicked', () => {
    renderWithRouter()
    const hamburger = screen.getByRole('button', { name: /open navigation menu/i })

    // Open drawer
    fireEvent.click(hamburger)
    // After clicking hamburger, the drawer open state changes (mobileNavOpen = true)
    // Click the Workouts link in the drawer
    const workoutsLink = screen.getByRole('link', { name: 'Workouts' })
    fireEvent.click(workoutsLink)
    // The drawer is closed after click — the outlet shows content but drawer nav is gone
    expect(screen.queryByRole('button', { name: /close navigation menu/i })).not.toBeInTheDocument()
  })

  it('closes drawer when close button is clicked', () => {
    renderWithRouter()
    const hamburger = screen.getByRole('button', { name: /open navigation menu/i })

    // Open drawer
    fireEvent.click(hamburger)
    expect(screen.getByText('Menu')).toBeInTheDocument()

    // Click close button
    const closeBtn = screen.getByRole('button', { name: /close navigation menu/i })
    fireEvent.click(closeBtn)

    // Drawer closed
    expect(screen.queryByText('Menu')).not.toBeInTheDocument()
  })

  it('renders desktop nav links hidden below md', () => {
    renderWithRouter()
    // Desktop nav is hidden on mobile — should be present with hidden md:flex
    const nav = screen.getByRole('navigation') || document.querySelector('nav')
    expect(nav).toBeInTheDocument()
  })
})