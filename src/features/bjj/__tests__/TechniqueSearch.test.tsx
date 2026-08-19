import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TechniqueSearch } from '../components/TechniqueSearch'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUseBJJTechniques = vi.fn()

vi.mock('../hooks/useBJJTechniques', () => ({
  useBJJTechniques: (opts: { search?: string }) => mockUseBJJTechniques(opts),
}))

// Mock supabase to prevent env validation errors
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    from: vi.fn(),
  },
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const sampleTechniques = [
  {
    id: 'tech-1',
    name: 'Closed Guard',
    category: 'guard' as const,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
  },
  {
    id: 'tech-2',
    name: 'Armbar',
    category: 'submission' as const,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
  },
  {
    id: 'tech-3',
    name: 'Hip Escape',
    category: 'escape' as const,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
  },
]

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}

function renderComponent(
  selectedIds: string[] = [],
  onChange: (ids: string[]) => void = vi.fn(),
  disabled = false,
) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <TechniqueSearch selectedIds={selectedIds} onChange={onChange} disabled={disabled} />
    </QueryClientProvider>,
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TechniqueSearch — REQ-316, REQ-317', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseBJJTechniques.mockReturnValue({ data: [], isLoading: false, error: null })
  })

  describe('input renders', () => {
    it('renders the search input', () => {
      renderComponent()
      expect(screen.getByLabelText(/search techniques/i)).toBeInTheDocument()
    })

    it('renders with placeholder text', () => {
      renderComponent()
      expect(screen.getByPlaceholderText(/search techniques/i)).toBeInTheDocument()
    })

    it('does not show any badges when selectedIds is empty', () => {
      renderComponent([])
      expect(screen.queryByLabelText(/selected techniques/i)).not.toBeInTheDocument()
    })
  })

  describe('search triggers query — REQ-317', () => {
    it('calls useBJJTechniques with initial empty search', () => {
      renderComponent()
      expect(mockUseBJJTechniques).toHaveBeenCalledWith({ search: undefined })
    })

    it('shows dropdown on focus without typing', async () => {
      mockUseBJJTechniques.mockReturnValue({
        data: sampleTechniques,
        isLoading: false,
        error: null,
      })

      const user = userEvent.setup()
      renderComponent()

      const input = screen.getByLabelText(/search techniques/i)
      await user.click(input)

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
        expect(screen.getByText('Closed Guard')).toBeInTheDocument()
      })
    })

    it('shows matching results when user types a query', async () => {
      mockUseBJJTechniques.mockReturnValue({
        data: sampleTechniques,
        isLoading: false,
        error: null,
      })

      const user = userEvent.setup()
      renderComponent()

      const input = screen.getByLabelText(/search techniques/i)
      await user.type(input, 'guard')

      await waitFor(() => {
        expect(screen.getByText('Closed Guard')).toBeInTheDocument()
      })
    })

    it('shows "No techniques found" when search returns empty', async () => {
      mockUseBJJTechniques.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      })

      const user = userEvent.setup()
      renderComponent()

      const input = screen.getByLabelText(/search techniques/i)
      await user.type(input, 'xyzunknown')

      await waitFor(() => {
        expect(screen.getByText(/no techniques match/i)).toBeInTheDocument()
      })
    })
  })

  describe('select adds to selectedIds — REQ-316', () => {
    it('calls onChange with new id when a technique is selected', async () => {
      mockUseBJJTechniques.mockReturnValue({
        data: sampleTechniques,
        isLoading: false,
        error: null,
      })

      const onChange = vi.fn()
      const user = userEvent.setup()
      renderComponent([], onChange)

      const input = screen.getByLabelText(/search techniques/i)
      await user.type(input, 'arm')

      await waitFor(() => expect(screen.getByText('Armbar')).toBeInTheDocument())

      // Use mousedown to trigger the onMouseDown handler (same as component)
      await user.pointer({ target: screen.getByText('Armbar'), keys: '[MouseLeft>]' })

      expect(onChange).toHaveBeenCalledWith(['tech-2'])
    })
  })

  describe('badge click removes from selectedIds — REQ-316', () => {
    it('renders selected techniques as badges', () => {
      mockUseBJJTechniques.mockReturnValue({
        data: sampleTechniques,
        isLoading: false,
        error: null,
      })

      renderComponent(['tech-1', 'tech-2'])
      // Badges show the id as fallback until user selects them (nameMap starts empty)
      expect(screen.getByLabelText(/selected techniques/i)).toBeInTheDocument()
    })

    it('calls onChange without the id when remove badge button is clicked', async () => {
      // Simulate a component that already has a name in its nameMap
      // by having the user type and select a technique first
      mockUseBJJTechniques.mockReturnValue({
        data: sampleTechniques,
        isLoading: false,
        error: null,
      })

      const onChange = vi.fn()
      const user = userEvent.setup()

      // Controlled component that tracks state
      const { rerender } = render(
        <QueryClientProvider client={createQueryClient()}>
          <TechniqueSearch selectedIds={[]} onChange={(ids) => onChange(ids)} disabled={false} />
        </QueryClientProvider>,
      )

      // Type to show results
      const input = screen.getByLabelText(/search techniques/i)
      await user.type(input, 'arm')

      await waitFor(() => expect(screen.getByText('Armbar')).toBeInTheDocument())

      // Select the technique
      await user.pointer({ target: screen.getByText('Armbar'), keys: '[MouseLeft>]' })

      expect(onChange).toHaveBeenCalledWith(['tech-2'])

      // Re-render with the technique selected (simulating controlled parent)
      rerender(
        <QueryClientProvider client={createQueryClient()}>
          <TechniqueSearch
            selectedIds={['tech-2']}
            onChange={(ids) => onChange(ids)}
            disabled={false}
          />
        </QueryClientProvider>,
      )

      // The badge should show (id shown as fallback text)
      const removeButton = screen.getByRole('button', { name: /remove/i })
      await user.click(removeButton)

      expect(onChange).toHaveBeenLastCalledWith([])
    })
  })

  describe('category chip filters — REQ-WF7', () => {
    beforeEach(() => {
      mockUseBJJTechniques.mockReturnValue({
        data: sampleTechniques,
        isLoading: false,
        error: null,
      })
    })

    it('renders category chips from the catalog', () => {
      renderComponent()

      expect(screen.getByRole('button', { name: 'Guard' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Submission' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Escape' })).toBeInTheDocument()
    })

    it('filters pick list when a category chip is selected', async () => {
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByLabelText(/search techniques/i))
      await user.click(screen.getByRole('button', { name: 'Guard' }))

      await waitFor(() => {
        expect(screen.getByText('Closed Guard')).toBeInTheDocument()
        expect(screen.queryByText('Armbar')).not.toBeInTheDocument()
      })
    })

    it('clears the category filter when the active chip is clicked again', async () => {
      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByLabelText(/search techniques/i))
      await user.click(screen.getByRole('button', { name: 'Guard' }))
      await user.click(screen.getByRole('button', { name: 'Guard' }))

      await waitFor(() => {
        expect(screen.getByText('Closed Guard')).toBeInTheDocument()
        expect(screen.getByText('Armbar')).toBeInTheDocument()
      })
    })

    it('shows a category-specific empty state when filter matches nothing', async () => {
      mockUseBJJTechniques.mockImplementation((opts?: { search?: string }) => {
        const data = opts === undefined ? sampleTechniques : [sampleTechniques[0]]
        return { data, isLoading: false, error: null }
      })

      const user = userEvent.setup()
      renderComponent()

      await user.click(screen.getByLabelText(/search techniques/i))
      await user.click(screen.getByRole('button', { name: 'Submission' }))

      await waitFor(() => {
        expect(screen.getByText(/no submission techniques available/i)).toBeInTheDocument()
      })
    })

    it('announces selection changes for screen readers', async () => {
      const onChange = vi.fn()
      const user = userEvent.setup()
      renderComponent([], onChange)

      await user.click(screen.getByLabelText(/search techniques/i))
      await user.pointer({ target: screen.getByText('Armbar'), keys: '[MouseLeft>]' })

      await waitFor(() => {
        expect(screen.getByText(/added armbar/i)).toBeInTheDocument()
      })
    })
  })

  describe('disabled prop respected — REQ-316', () => {
    it('disables the search input when disabled=true', () => {
      renderComponent([], vi.fn(), true)
      expect(screen.getByLabelText(/search techniques/i)).toBeDisabled()
    })

    it('does not disable the search input when disabled=false', () => {
      renderComponent([], vi.fn(), false)
      expect(screen.getByLabelText(/search techniques/i)).not.toBeDisabled()
    })
  })
})
