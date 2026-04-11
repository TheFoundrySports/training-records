import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, FormProvider } from 'react-hook-form'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MovementFieldArray } from './MovementFieldArray'

// Mock useExercises so ExercisePicker doesn't need network
vi.mock('@/features/exercises/hooks/useExercises', () => ({
  useExercises: vi.fn(() => ({ data: { data: [] }, isLoading: false })),
  useExercise: vi.fn(() => ({ data: null, isLoading: false })),
}))

function TestWrapper({ defaultMovements = [] }: { defaultMovements?: unknown[] }) {
  const form = useForm({
    defaultValues: {
      movements: defaultMovements,
    },
  })

  return (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <FormProvider {...form}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <MovementFieldArray control={form.control as any} name="movements" />
      </FormProvider>
    </QueryClientProvider>
  )
}

describe('MovementFieldArray', () => {
  it('renders empty state text when no movements', () => {
    render(<TestWrapper />)
    expect(screen.getByText(/no movements yet/i)).toBeInTheDocument()
  })

  it('"Add movement" button adds a new movement row', async () => {
    const user = userEvent.setup()
    render(<TestWrapper />)

    const addBtn = screen.getByRole('button', { name: /add movement/i })
    await user.click(addBtn)

    expect(screen.getByTestId('movement-row-0')).toBeInTheDocument()
    expect(screen.queryByText(/no movements yet/i)).not.toBeInTheDocument()
  })

  it('"Remove" button removes a movement row', async () => {
    const user = userEvent.setup()
    render(
      <TestWrapper
        defaultMovements={[
          {
            exerciseId: '',
            exerciseName: '',
            reps: undefined,
            weight: undefined,
            weightUnit: 'kg',
          },
        ]}
      />,
    )

    // Movement row should be present
    expect(screen.getByTestId('movement-row-0')).toBeInTheDocument()

    // Click remove
    const removeBtn = screen.getByRole('button', { name: /remove movement 1/i })
    await user.click(removeBtn)

    // Empty state should show again
    expect(screen.queryByTestId('movement-row-0')).not.toBeInTheDocument()
    expect(screen.getByText(/no movements yet/i)).toBeInTheDocument()
  })

  it('shows multiple movement rows when multiple movements are provided', () => {
    const movements = [
      { exerciseId: '', exerciseName: '', reps: undefined, weight: undefined, weightUnit: 'kg' },
      { exerciseId: '', exerciseName: '', reps: undefined, weight: undefined, weightUnit: 'kg' },
    ]
    render(<TestWrapper defaultMovements={movements} />)

    expect(screen.getByTestId('movement-row-0')).toBeInTheDocument()
    expect(screen.getByTestId('movement-row-1')).toBeInTheDocument()
  })
})
