import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { TechniqueWithThreshold } from '../hooks/useTechniqueThresholds'
import { ThresholdRow } from '../components/ThresholdRow'
import { useUpdateTechniqueThreshold } from '../hooks/useUpdateTechniqueThreshold'

// Mock at top level
vi.mock('../hooks/useUpdateTechniqueThreshold', () => ({
  useUpdateTechniqueThreshold: vi.fn().mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  } as any),
}))

const mockTechnique: TechniqueWithThreshold = {
  techniqueId: 'tech-123',
  name: 'Knee Slide Pass',
  category: 'guard_pass',
  currentThreshold: 10,
}

describe('ThresholdRow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders technique name and category', () => {
    render(<ThresholdRow technique={mockTechnique} />)

    expect(screen.getByText('Knee Slide Pass')).toBeInTheDocument()
    expect(screen.getByText('guard_pass')).toBeInTheDocument()
  })

  it('displays "—" when category is null', () => {
    const nullCategoryTechnique: TechniqueWithThreshold = {
      ...mockTechnique,
      category: null,
    }
    render(<ThresholdRow technique={nullCategoryTechnique} />)

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows current threshold value in input', () => {
    render(<ThresholdRow technique={mockTechnique} />)

    const input = screen.getByRole('spinbutton')
    expect(input).toHaveValue(10)
  })

  it('shows current threshold value of 15 when stored', () => {
    const techniqueWithStoredThreshold: TechniqueWithThreshold = {
      ...mockTechnique,
      currentThreshold: 15,
    }
    render(<ThresholdRow technique={techniqueWithStoredThreshold} />)

    const input = screen.getByRole('spinbutton')
    expect(input).toHaveValue(15)
  })

  it('calls mutation with correct values when Save is clicked', async () => {
    const user = userEvent.setup()
    const mockMutate = vi.fn()
    vi.mocked(useUpdateTechniqueThreshold).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as any)

    render(<ThresholdRow technique={mockTechnique} />)

    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    await user.type(input, '20')

    const saveButton = screen.getByRole('button', { name: 'Save' })
    await user.click(saveButton)

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ techniqueId: 'tech-123', requiredPractices: 20 }),
      expect.any(Object),
    )
  })

  it('shows loading state during mutation', () => {
    vi.mocked(useUpdateTechniqueThreshold).mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      isSuccess: false,
      isError: false,
      error: null,
    } as any)

    render(<ThresholdRow technique={mockTechnique} />)

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  })

  it('reset input to saved value after mutation success', () => {
    vi.mocked(useUpdateTechniqueThreshold).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: true,
      isError: false,
      error: null,
    } as any)

    render(<ThresholdRow technique={mockTechnique} />)

    const input = screen.getByRole('spinbutton')
    expect(input).toHaveValue(10)
  })
})