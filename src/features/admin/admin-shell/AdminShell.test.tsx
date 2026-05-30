import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AdminShell } from './AdminShell'
import userEvent from '@testing-library/user-event'

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
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function renderWithRouter(initialPath: string = '/admin/bjj-techniques') {
  const queryClient = makeQueryClient()

  const entries = [
    '/admin/bjj-techniques',
    '/admin/ai-settings',
    '/admin/technique-thresholds',
    '/admin/users',
  ]
  const initialIndex = entries.indexOf(initialPath)

  return render(
    <MemoryRouter initialIndex={initialIndex} initialEntries={entries}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/admin" element={<AdminShell />}>
            <Route path="bjj-techniques" element={<div>BJJ Techniques Content</div>} />
            <Route path="ai-settings" element={<div>AI Settings Content</div>} />
            <Route path="technique-thresholds" element={<div>Thresholds Content</div>} />
            <Route path="users" element={<div>Users Content</div>} />
          </Route>
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
    { wrapper: makeWrapper(queryClient) },
  )
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('AdminShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders 4 nav items', async () => {
    renderWithRouter('/admin/bjj-techniques')

    expect(screen.getByText('BJJ Techniques')).toBeInTheDocument()
    expect(screen.getByText('AI Settings')).toBeInTheDocument()
    expect(screen.getByText('Thresholds')).toBeInTheDocument()
    expect(screen.getByText('Users')).toBeInTheDocument()
  })

  it('renders Outlet for nested route content', async () => {
    renderWithRouter('/admin/users')

    expect(screen.getByText('Users Content')).toBeInTheDocument()
  })

  it('highlights active nav item when on that route', async () => {
    renderWithRouter('/admin/ai-settings')

    const aiSettingsLink = screen.getByText('AI Settings')
    expect(aiSettingsLink.closest('a')).toHaveClass('bg-primary')
  })

  it('does not highlight inactive nav item', async () => {
    renderWithRouter('/admin/bjj-techniques')

    const aiSettingsLink = screen.getByText('AI Settings')
    expect(aiSettingsLink.closest('a')).not.toHaveClass('bg-primary')
  })

  it('renders hamburger button in mobile header area (lg:hidden parent container)', () => {
    renderWithRouter('/admin/bjj-techniques')

    // The hamburger is inside a div with lg:hidden class (shown below lg)
    const mobileHeader = document.querySelector('div.lg\\:hidden')
    expect(mobileHeader).toBeInTheDocument()

    const hamburger = screen.getByRole('button', { name: /open admin navigation/i })
    expect(hamburger).toBeInTheDocument()
  })

  it('opens sidebar drawer when hamburger is clicked', async () => {
    const user = userEvent.setup()
    renderWithRouter('/admin/bjj-techniques')

    const hamburger = screen.getByRole('button', { name: /open admin navigation/i })
    await user.click(hamburger)

    // Drawer shows header + same nav items (getAllBy since desktop sidebar may also exist but hidden)
    expect(screen.getAllByText('Admin').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('BJJ Techniques').length).toBeGreaterThanOrEqual(1)
  })

  it('closes drawer when nav link is clicked', async () => {
    const user = userEvent.setup()
    renderWithRouter('/admin/bjj-techniques')

    // Open drawer
    const hamburger = screen.getByRole('button', { name: /open admin navigation/i })
    await user.click(hamburger)

    // Click a nav link in the drawer
    const bjjLink = screen.getByRole('link', { name: 'BJJ Techniques' })
    await user.click(bjjLink)

    // Drawer should be closed — close button should not be present
    expect(screen.queryByRole('button', { name: /close admin navigation/i })).not.toBeInTheDocument()
  })

  it('closes drawer when close button is clicked', async () => {
    const user = userEvent.setup()
    renderWithRouter('/admin/bjj-techniques')

    // Open drawer
    const hamburger = screen.getByRole('button', { name: /open admin navigation/i })
    await user.click(hamburger)

    // Click close button
    const closeBtn = screen.getByRole('button', { name: /close admin navigation/i })
    await user.click(closeBtn)

    // Drawer should be closed — close button should not be present
    expect(screen.queryByRole('button', { name: /close admin navigation/i })).not.toBeInTheDocument()
  })

  it('desktop sidebar is hidden below lg (has hidden lg:flex)', () => {
    renderWithRouter('/admin/bjj-techniques')

    const sidebar = document.querySelector('aside')
    expect(sidebar).toBeInTheDocument()
    expect(sidebar).toHaveClass('hidden', 'lg:flex')
  })
})