import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkoutFormPage } from './WorkoutFormPage'
import { ThemeProvider } from '@/theme/ThemeContext'
import type { useCreateWorkout, useUpdateWorkout } from '../hooks/useWorkoutMutations'
import type { useWorkout } from '../hooks/useWorkouts'
import type { WorkoutFormValues } from '../workout.schema'

// Mock mutation hooks
vi.mock('../hooks/useWorkoutMutations', () => ({
  useCreateWorkout: vi.fn(),
  useUpdateWorkout: vi.fn(),
  useDeleteWorkout: vi.fn(),
}))

// Mock query hook
vi.mock('../hooks/useWorkouts', () => ({
  useWorkouts: vi.fn(),
  useWorkout: vi.fn(),
}))

// Mock useExercises so ExercisePicker (used in AmrapFormSection) doesn't need network
vi.mock('@/features/exercises/hooks/useExercises', () => ({
  useExercises: vi.fn(() => ({ data: { data: [] }, isLoading: false })),
}))

import {
  useCreateWorkout as useCreateWorkoutMock,
  useUpdateWorkout as useUpdateWorkoutMock,
} from '../hooks/useWorkoutMutations'
import { useWorkout as useWorkoutMock } from '../hooks/useWorkouts'

const mockCreate = vi.mocked(useCreateWorkoutMock)
const mockUpdate = vi.mocked(useUpdateWorkoutMock)
const mockWorkout = vi.mocked(useWorkoutMock)

type CreateResult = ReturnType<typeof useCreateWorkout>
type UpdateResult = ReturnType<typeof useUpdateWorkout>
type WorkoutResult = ReturnType<typeof useWorkout>

function makeCreateMutation(overrides: Partial<CreateResult> = {}): CreateResult {
  return {
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
    ...overrides,
  } as unknown as CreateResult
}

function makeUpdateMutation(overrides: Partial<UpdateResult> = {}): UpdateResult {
  return {
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
    ...overrides,
  } as unknown as UpdateResult
}

function makeWorkoutQuery(overrides: Partial<WorkoutResult> = {}): WorkoutResult {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  } as unknown as WorkoutResult
}

function renderCreate() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/workouts/new']}>
          <Routes>
            <Route path="/workouts/new" element={<WorkoutFormPage />} />
            <Route path="/workouts" element={<div>Workouts list</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

function renderCreateWithPrefill(prefill: WorkoutFormValues) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[{ pathname: '/workouts/new', state: { prefill } }]}>
          <Routes>
            <Route path="/workouts/new" element={<WorkoutFormPage />} />
            <Route path="/workouts" element={<div>Workouts list</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
})

const samplePrefill: WorkoutFormValues = {
  title: 'AI Generated WOD',
  type: 'crossfit',
  performedAt: '2026-04-15T10:00',
  durationMinutes: 45,
  notes: 'Generated from prompt',
  rpe: 7,
  wodFormat: 'amrap',
  wodText: '20 min AMRAP: 10 pull-ups, 20 push-ups',
}

describe('WorkoutFormPage (create mode)', () => {
  beforeEach(() => {
    mockCreate.mockReturnValue(makeCreateMutation())
    mockUpdate.mockReturnValue(makeUpdateMutation())
    mockWorkout.mockReturnValue(makeWorkoutQuery())
  })

  it('shows all form fields', () => {
    renderCreate()

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/duration/i)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /^Notes$/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/wod text/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/rpe/i)).toBeInTheDocument()
  })

  it('shows validation error for empty title on submit', async () => {
    const user = userEvent.setup()
    renderCreate()

    // Clear title and submit
    const titleInput = screen.getByLabelText(/title/i)
    await user.clear(titleInput)
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for durationMinutes = 0', async () => {
    const user = userEvent.setup()
    renderCreate()

    const durationInput = screen.getByLabelText(/duration/i)
    await user.clear(durationInput)
    await user.type(durationInput, '0')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/at least 1 minute/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for durationMinutes = 301', async () => {
    const user = userEvent.setup()
    renderCreate()

    const durationInput = screen.getByLabelText(/duration/i)
    await user.clear(durationInput)
    await user.type(durationInput, '301')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/300 minutes or less/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for rpe = 11', async () => {
    const user = userEvent.setup()
    renderCreate()

    const rpeInput = screen.getByLabelText(/rpe/i)
    await user.clear(rpeInput)
    await user.type(rpeInput, '11')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/rpe must be between 1 and 10/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for rpe = 0', async () => {
    const user = userEvent.setup()
    renderCreate()

    const rpeInput = screen.getByLabelText(/rpe/i)
    await user.clear(rpeInput)
    await user.type(rpeInput, '0')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/rpe must be between 1 and 10/i)).toBeInTheDocument()
    })
  })

  it('calls createWorkout mutation with valid payload on submit', async () => {
    const user = userEvent.setup()
    const mutateAsync = vi.fn().mockResolvedValue({})
    mockCreate.mockReturnValue(makeCreateMutation({ mutateAsync }))
    renderCreate()

    await user.clear(screen.getByLabelText(/title/i))
    await user.type(screen.getByLabelText(/title/i), 'Test WOD')

    const durationInput = screen.getByLabelText(/duration/i)
    await user.clear(durationInput)
    await user.type(durationInput, '45')

    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test WOD',
          durationMinutes: 45,
        }),
      )
    })
  })

  it('navigates to /workouts on successful create', async () => {
    const user = userEvent.setup()
    const mutateAsync = vi.fn().mockResolvedValue({})
    mockCreate.mockReturnValue(makeCreateMutation({ mutateAsync }))
    renderCreate()

    await user.clear(screen.getByLabelText(/title/i))
    await user.type(screen.getByLabelText(/title/i), 'Test WOD')

    const durationInput = screen.getByLabelText(/duration/i)
    await user.clear(durationInput)
    await user.type(durationInput, '45')

    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText('Workouts list')).toBeInTheDocument()
    })
  })

  it('shows loading state on submit button while pending', () => {
    mockCreate.mockReturnValue(makeCreateMutation({ isPending: true }))
    renderCreate()

    const saveBtn = screen.getByRole('button', { name: /saving/i })
    expect(saveBtn).toBeDisabled()
  })

  it('wod_text textarea renders', () => {
    renderCreate()
    expect(screen.getByLabelText(/wod text/i)).toBeInTheDocument()
  })

  it('submitting with wodText sends it in the request body', async () => {
    const user = userEvent.setup()
    const mutateAsync = vi.fn().mockResolvedValue({})
    mockCreate.mockReturnValue(makeCreateMutation({ mutateAsync }))
    renderCreate()

    await user.clear(screen.getByLabelText(/title/i))
    await user.type(screen.getByLabelText(/title/i), 'WOD with text')

    const durationInput = screen.getByLabelText(/duration/i)
    await user.clear(durationInput)
    await user.type(durationInput, '30')

    const wodTextarea = screen.getByLabelText(/wod text/i)
    await user.type(wodTextarea, '3 rounds: 10 pull-ups, 20 push-ups')

    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          wodText: '3 rounds: 10 pull-ups, 20 push-ups',
        }),
      )
    })
  })

  it('submitting without wodText passes with no validation error', async () => {
    const user = userEvent.setup()
    const mutateAsync = vi.fn().mockResolvedValue({})
    mockCreate.mockReturnValue(makeCreateMutation({ mutateAsync }))
    renderCreate()

    await user.clear(screen.getByLabelText(/title/i))
    await user.type(screen.getByLabelText(/title/i), 'No WOD text')

    const durationInput = screen.getByLabelText(/duration/i)
    await user.clear(durationInput)
    await user.type(durationInput, '30')

    // Leave wodText empty and submit
    await user.click(screen.getByRole('button', { name: /save/i }))

    // Mutation should be called — no validation error blocks submission
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled()
    })
  })

  it('renders WodFormatSelector in the form', () => {
    renderCreate()
    // The WodFormatSelector renders a label "WOD Format"
    expect(screen.getByLabelText(/wod format/i)).toBeInTheDocument()
  })

  it('selecting "amrap" shows the AMRAP form section', async () => {
    const user = userEvent.setup()
    renderCreate()

    const formatSelect = screen.getByLabelText(/wod format/i)
    await user.selectOptions(formatSelect, 'amrap')

    await waitFor(() => {
      expect(screen.getByTestId('wod-form-section-amrap-payload')).toBeInTheDocument()
    })
  })

  it('pre-fills form fields from location.state.prefill', async () => {
    renderCreateWithPrefill(samplePrefill)

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveValue('AI Generated WOD')
      expect(screen.getByLabelText(/duration/i)).toHaveValue(45)
      expect(screen.getByLabelText(/wod text/i)).toHaveValue(
        '20 min AMRAP: 10 pull-ups, 20 push-ups',
      )
    })
  })
})
