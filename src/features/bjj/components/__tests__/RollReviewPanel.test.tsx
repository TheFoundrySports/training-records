/**
 * Tests for RollReviewPanel (REQ-FRM1, REQ-WF5).
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ComponentProps } from 'react'
import { RollReviewPanel } from '../RollReviewPanel'
import type { BJJRollDraft } from '../../bjj.schema'

vi.mock('../../dashboard/hooks/useBJJPositions', () => ({
  useBJJPositions: () => ({
    data: [
      { key: 'closed_guard', display_en: 'Closed Guard' },
      { key: 'mount', display_en: 'Mount' },
      { key: 'side_control', display_en: 'Side Control' },
    ],
  }),
}))

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

function renderWithProviders(ui: React.ReactElement) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

function panelProps(overrides: Partial<ComponentProps<typeof RollReviewPanel>> = {}) {
  return {
    rolls: [mockValidRoll],
    onConfirmRoll: vi.fn(),
    onConfirmAll: vi.fn(),
    onSkip: vi.fn(),
    onChange: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  }
}

const mockValidRoll: BJJRollDraft = {
  roll_index: 1,
  role: 'attacking',
  outcome: 'submission',
  position_from: 'closed_guard',
  position_to: 'mount',
  technique_names: ['armbar'],
  confidence: 0.82,
  raw_excerpt: 'From closed guard I transitioned to mount and got an armbar',
  validation_error: null,
  source: 'ai_confirmed',
}

const mockInvalidRoll: BJJRollDraft = {
  roll_index: 2,
  role: 'defending',
  outcome: 'position_loss',
  position_from: 'unknown_position',
  position_to: 'side_control',
  technique_names: [],
  confidence: 0.45,
  raw_excerpt: 'Got passed from unknown position to side control',
  validation_error: 'unknown_position_from',
  source: 'ai_confirmed',
}

describe('RollReviewPanel', () => {
  it('renders roll count and basic structure', () => {
    renderWithProviders(<RollReviewPanel {...panelProps()} />)

    expect(screen.getByText(/1 proposed/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^confirm$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm all/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /skip for now/i })).toBeInTheDocument()
  })

  it('hides position selects in read mode for valid rolls', () => {
    renderWithProviders(<RollReviewPanel {...panelProps()} />)

    expect(screen.queryByLabelText(/^role$/i)).not.toBeInTheDocument()
    expect(screen.getByText(/closed guard → mount/i)).toBeInTheDocument()
  })

  it('shows edit controls when Edit is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RollReviewPanel {...panelProps()} />)

    await user.click(screen.getByRole('button', { name: /^edit$/i }))

    expect(screen.getByLabelText(/^role$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /done editing/i })).toBeInTheDocument()
  })

  it('calls onConfirmRoll when Confirm is clicked', async () => {
    const user = userEvent.setup()
    const onConfirmRoll = vi.fn()
    renderWithProviders(<RollReviewPanel {...panelProps({ onConfirmRoll })} />)

    await user.click(screen.getByRole('button', { name: /^confirm$/i }))

    expect(onConfirmRoll).toHaveBeenCalledWith(0)
  })

  it('displays confidence badge and raw excerpt in edit mode', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RollReviewPanel {...panelProps()} />)

    expect(screen.getByText(/82% confidence/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    await user.click(screen.getByText(/ai context/i))

    expect(screen.getByText(/From closed guard I transitioned/i)).toBeInTheDocument()
  })

  it('opens edit mode automatically for invalid rolls', () => {
    renderWithProviders(<RollReviewPanel {...panelProps({ rolls: [mockInvalidRoll] })} />)

    expect(screen.getByLabelText(/^from position$/i)).toBeInTheDocument()
    expect(screen.getByText(/not recognized/i)).toBeInTheDocument()
  })

  it('hides Confirm actions when only invalid rolls exist', () => {
    renderWithProviders(<RollReviewPanel {...panelProps({ rolls: [mockInvalidRoll] })} />)

    expect(screen.queryByRole('button', { name: /^confirm$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /confirm all/i })).not.toBeInTheDocument()
  })

  it('enables Confirm all when no validation errors', () => {
    renderWithProviders(<RollReviewPanel {...panelProps()} />)

    expect(screen.getByRole('button', { name: /confirm all/i })).not.toBeDisabled()
  })

  it('calls onSkip when Skip for now is clicked', async () => {
    const user = userEvent.setup()
    const onSkip = vi.fn()
    renderWithProviders(<RollReviewPanel {...panelProps({ onSkip })} />)

    await user.click(screen.getByRole('button', { name: /skip for now/i }))

    expect(onSkip).toHaveBeenCalledOnce()
  })

  it('calls onConfirmAll when Confirm all is clicked', async () => {
    const user = userEvent.setup()
    const onConfirmAll = vi.fn()
    renderWithProviders(<RollReviewPanel {...panelProps({ onConfirmAll })} />)

    await user.click(screen.getByRole('button', { name: /confirm all \(0\/1\)/i }))

    expect(onConfirmAll).toHaveBeenCalledOnce()
  })

  it('shows confirmed state when reviewComplete is true', () => {
    renderWithProviders(
      <RollReviewPanel
        {...panelProps({
          rolls: [{ ...mockValidRoll, reviewConfirmed: true }],
          reviewComplete: true,
        })}
      />,
    )

    expect(screen.getByText(/1 confirmed/i)).toBeInTheDocument()
    expect(screen.getByText(/ready to save with this workout/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /confirm all/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^confirm$/i })).not.toBeInTheDocument()
  })

  it('calls onDelete when Discard is clicked', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    renderWithProviders(<RollReviewPanel {...panelProps({ onDelete })} />)

    await user.click(screen.getByRole('button', { name: /discard roll 1/i }))

    expect(onDelete).toHaveBeenCalledWith(0)
  })

  it('renders multiple rolls with correct indices', () => {
    const rolls = [mockValidRoll, { ...mockValidRoll, roll_index: 2 }]

    renderWithProviders(<RollReviewPanel {...panelProps({ rolls })} />)

    expect(screen.getByText(/2 proposed/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /discard roll 1/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /discard roll 2/i })).toBeInTheDocument()
  })
})
