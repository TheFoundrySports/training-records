import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { bjjWorkoutSchema, type BJJWorkoutFormValues } from '../bjj.schema'
import { BJJSectionEditor } from '../components/BJJSectionEditor'
import { Form } from '@/components/ui/form'
import { useBJJSectionAI } from '../hooks/useBJJSectionAI'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const enhanceMock = vi.fn()

// Mock useBJJSectionAI to avoid Supabase network calls
vi.mock('../hooks/useBJJSectionAI', () => ({
  useBJJSectionAI: vi.fn(),
}))

// Mock useBJJTechniques to return empty results
vi.mock('../hooks/useBJJTechniques', () => ({
  useBJJTechniques: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
}))

// Mock supabase to prevent env errors
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}))

// ── Test wrapper ──────────────────────────────────────────────────────────────

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

interface WrapperProps {
  index?: number
  removeDisabled?: boolean
  isPending?: boolean
  onRemove?: () => void
}

/**
 * Renders BJJSectionEditor inside the required RHF Form and QueryClientProvider.
 * Uses a real useForm with bjjWorkoutSchema to provide a properly-typed control.
 */
function SectionEditorWrapper({
  index = 0,
  removeDisabled = false,
  isPending = false,
  onRemove = vi.fn(),
}: WrapperProps) {
  const form = useForm<BJJWorkoutFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(bjjWorkoutSchema) as any,
    defaultValues: {
      title: 'Test BJJ',
      performedAt: '2026-04-05T10:00',
      durationMinutes: 60,
      sections: [
        {
          goal: '',
          rawDescription: '',
          durationMinutes: undefined,
          techniqueIds: [],
        },
      ],
    },
  })

  return (
    <QueryClientProvider client={createQueryClient()}>
      <Form {...form}>
        <form>
          <BJJSectionEditor
            index={index}
            control={form.control as any}
            onRemove={onRemove}
            removeDisabled={removeDisabled}
            isPending={isPending}
          />
        </form>
      </Form>
    </QueryClientProvider>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BJJSectionEditor — REQ-306, REQ-315', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    enhanceMock.mockImplementation(
      (_input: unknown, opts?: { onSettled?: () => void }) => {
        queueMicrotask(() => {
          opts?.onSettled?.()
        })
      },
    )
    vi.mocked(useBJJSectionAI).mockReturnValue({
      enhance: enhanceMock,
      enhanceAsync: enhanceMock,
      isPending: false,
      error: null,
      reset: vi.fn(),
    })
  })

  describe('fields render', () => {
    it('renders the section heading with correct section number', () => {
      render(<SectionEditorWrapper index={0} />)
      expect(screen.getByText('Section 1')).toBeInTheDocument()
    })

    it('renders the Goal label and input', () => {
      render(<SectionEditorWrapper />)
      expect(screen.getByLabelText(/goal/i)).toBeInTheDocument()
    })

    it('renders the Notes optional textarea', () => {
      render(<SectionEditorWrapper />)
      expect(screen.getByLabelText('Notes (optional)')).toBeInTheDocument()
    })

    it('renders the Duration optional input', () => {
      render(<SectionEditorWrapper />)
      expect(screen.getByLabelText(/duration/i)).toBeInTheDocument()
    })

    it('renders the Techniques search input', () => {
      render(<SectionEditorWrapper />)
      expect(screen.getByLabelText(/search techniques/i)).toBeInTheDocument()
    })

    it('renders the Remove button', () => {
      render(<SectionEditorWrapper />)
      expect(screen.getByRole('button', { name: /remove section 1/i })).toBeInTheDocument()
    })
  })

  describe('Remove button disabled on single section — REQ-306', () => {
    it('disables Remove button when removeDisabled=true', () => {
      render(<SectionEditorWrapper removeDisabled={true} />)
      const removeBtn = screen.getByRole('button', { name: /remove section 1/i })
      expect(removeBtn).toBeDisabled()
    })

    it('enables Remove button when removeDisabled=false', () => {
      render(<SectionEditorWrapper removeDisabled={false} />)
      const removeBtn = screen.getByRole('button', { name: /remove section 1/i })
      expect(removeBtn).not.toBeDisabled()
    })

    it('calls onRemove when Remove button is clicked', async () => {
      const onRemove = vi.fn()
      const user = userEvent.setup()
      render(<SectionEditorWrapper removeDisabled={false} onRemove={onRemove} />)

      await user.click(screen.getByRole('button', { name: /remove section 1/i }))
      expect(onRemove).toHaveBeenCalledOnce()
    })
  })

  describe('validation error on empty goal submit — REQ-315', () => {
    it('shows validation error when goal is empty and form submits', async () => {
      const user = userEvent.setup()

      function WrapperWithSubmit() {
        const form = useForm<BJJWorkoutFormValues>({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          resolver: zodResolver(bjjWorkoutSchema) as any,
          defaultValues: {
            title: '',
            performedAt: '2026-04-05T10:00',
            durationMinutes: 60,
            sections: [
              { goal: '', rawDescription: '', durationMinutes: undefined, techniqueIds: [] },
            ],
          },
        })

        return (
          <QueryClientProvider client={createQueryClient()}>
            <Form {...form}>
              <form onSubmit={(e) => void form.handleSubmit(() => {})(e)}>
                <BJJSectionEditor
                  index={0}
                  control={form.control as any}
                  onRemove={vi.fn()}
                  removeDisabled={true}
                  isPending={false}
                />
                <button type="submit">Submit</button>
              </form>
            </Form>
          </QueryClientProvider>
        )
      }

      render(<WrapperWithSubmit />)

      await user.click(screen.getByRole('button', { name: /submit/i }))

      // Should show the "Goal is required" validation error
      expect(await screen.findByText('Goal is required')).toBeInTheDocument()
    })
  })

  describe('Enhance with AI button visibility', () => {
    it('shows Enhance button (disabled) when both goal and rawDescription are empty', () => {
      render(<SectionEditorWrapper />)
      const btn = screen.getByRole('button', { name: /enhance with ai/i })
      expect(btn).toBeInTheDocument()
      expect(btn).toBeDisabled()
    })

    it('enables Enhance button after typing in Notes field', async () => {
      const user = userEvent.setup()
      render(<SectionEditorWrapper />)

      const notesInput = screen.getByLabelText('Notes (optional)')
      await user.type(notesInput, 'Some notes about drilling')

      expect(screen.getByRole('button', { name: /enhance with ai/i })).not.toBeDisabled()
    })

    it('enables Enhance button when goal has content', async () => {
      const user = userEvent.setup()
      render(<SectionEditorWrapper />)

      const goalInput = screen.getByLabelText(/goal/i)
      await user.type(goalInput, 'Guard passing')

      expect(screen.getByRole('button', { name: /enhance with ai/i })).not.toBeDisabled()
    })

    it('does not invoke enhance twice when the button receives two clicks in one sync turn', async () => {
      const user = userEvent.setup()
      render(<SectionEditorWrapper />)
      await user.type(screen.getByLabelText('Notes (optional)'), 'drilling')

      const btn = screen.getByRole('button', { name: /enhance with ai/i })
      fireEvent.click(btn)
      fireEvent.click(btn)

      expect(enhanceMock).toHaveBeenCalledOnce()
    })
  })
})
