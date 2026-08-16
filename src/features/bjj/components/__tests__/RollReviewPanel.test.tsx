/**
 * Tests for RollReviewPanel (REQ-FRM1 PR 2b, Task 2.14).
 *
 * Coverage:
 * - Renders per-row controls (role, outcome, positions, techniques, delete)
 * - Displays confidence badge + raw excerpt
 * - Shows validation error warning with red border
 * - Blocks "Confirm all" when validation_error exists
 * - "Skip for now" clears drafts
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RollReviewPanel } from '../RollReviewPanel'
import type { BJJRollDraft } from '../../bjj.schema'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

function renderWithProviders(ui: React.ReactElement) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
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
    const onConfirmAll = vi.fn()
    const onSkip = vi.fn()
    const onChange = vi.fn()
    const onDelete = vi.fn()

    renderWithProviders(
      <RollReviewPanel
        rolls={[mockValidRoll]}
        onConfirmAll={onConfirmAll}
        onSkip={onSkip}
        onChange={onChange}
        onDelete={onDelete}
      />
    )

    expect(screen.getByText(/1 roll/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm all/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /skip for now/i })).toBeInTheDocument()
  })

  it('displays confidence badge and raw excerpt', async () => {
    const user = userEvent.setup()
    const onConfirmAll = vi.fn()
    const onSkip = vi.fn()
    const onChange = vi.fn()
    const onDelete = vi.fn()

    renderWithProviders(
      <RollReviewPanel
        rolls={[mockValidRoll]}
        onConfirmAll={onConfirmAll}
        onSkip={onSkip}
        onChange={onChange}
        onDelete={onDelete}
      />
    )

    // Confidence should be displayed as percentage
    expect(screen.getByText('82%')).toBeInTheDocument()
    
    // Raw excerpt should be behind "AI Context" button (collapsed by default)
    expect(screen.getByText('AI Context')).toBeInTheDocument()
    
    // Click to expand
    const contextButton = screen.getByText('AI Context')
    await user.click(contextButton)
    
    // Now excerpt should be visible
    expect(screen.getByText(/From closed guard I transitioned/i)).toBeInTheDocument()
  })

  it('shows validation error warning with red border', () => {
    const onConfirmAll = vi.fn()
    const onSkip = vi.fn()
    const onChange = vi.fn()
    const onDelete = vi.fn()

    renderWithProviders(
      <RollReviewPanel
        rolls={[mockInvalidRoll]}
        onConfirmAll={onConfirmAll}
        onSkip={onSkip}
        onChange={onChange}
        onDelete={onDelete}
      />
    )

    // Should show warning message
    expect(screen.getByText(/not recognized/i)).toBeInTheDocument()
  })

  it('disables Confirm all button when validation_error exists', () => {
    const onConfirmAll = vi.fn()
    const onSkip = vi.fn()
    const onChange = vi.fn()
    const onDelete = vi.fn()

    renderWithProviders(
      <RollReviewPanel
        rolls={[mockInvalidRoll]}
        onConfirmAll={onConfirmAll}
        onSkip={onSkip}
        onChange={onChange}
        onDelete={onDelete}
      />
    )

    const confirmButton = screen.getByRole('button', { name: /confirm all/i })
    expect(confirmButton).toBeDisabled()
  })

  it('enables Confirm all button when no validation errors', () => {
    const onConfirmAll = vi.fn()
    const onSkip = vi.fn()
    const onChange = vi.fn()
    const onDelete = vi.fn()

    renderWithProviders(
      <RollReviewPanel
        rolls={[mockValidRoll]}
        onConfirmAll={onConfirmAll}
        onSkip={onSkip}
        onChange={onChange}
        onDelete={onDelete}
      />
    )

    const confirmButton = screen.getByRole('button', { name: /confirm all/i })
    expect(confirmButton).not.toBeDisabled()
  })

  it('calls onSkip when Skip for now is clicked', async () => {
    const user = userEvent.setup()
    const onConfirmAll = vi.fn()
    const onSkip = vi.fn()
    const onChange = vi.fn()
    const onDelete = vi.fn()

    renderWithProviders(
      <RollReviewPanel
        rolls={[mockValidRoll]}
        onConfirmAll={onConfirmAll}
        onSkip={onSkip}
        onChange={onChange}
        onDelete={onDelete}
      />
    )

    const skipButton = screen.getByRole('button', { name: /skip for now/i })
    await user.click(skipButton)

    expect(onSkip).toHaveBeenCalledOnce()
  })

  it('calls onConfirmAll when Confirm all is clicked', async () => {
    const user = userEvent.setup()
    const onConfirmAll = vi.fn()
    const onSkip = vi.fn()
    const onChange = vi.fn()
    const onDelete = vi.fn()

    renderWithProviders(
      <RollReviewPanel
        rolls={[mockValidRoll]}
        onConfirmAll={onConfirmAll}
        onSkip={onSkip}
        onChange={onChange}
        onDelete={onDelete}
      />
    )

    const confirmButton = screen.getByRole('button', { name: /confirm all/i })
    await user.click(confirmButton)

    expect(onConfirmAll).toHaveBeenCalledOnce()
  })

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup()
    const onConfirmAll = vi.fn()
    const onSkip = vi.fn()
    const onChange = vi.fn()
    const onDelete = vi.fn()

    renderWithProviders(
      <RollReviewPanel
        rolls={[mockValidRoll]}
        onConfirmAll={onConfirmAll}
        onSkip={onSkip}
        onChange={onChange}
        onDelete={onDelete}
      />
    )

    const deleteButton = screen.getByRole('button', { name: /remove roll 1/i })
    await user.click(deleteButton)

    expect(onDelete).toHaveBeenCalledWith(0) // first roll index
  })

  it('renders multiple rolls with correct indices', () => {
    const onConfirmAll = vi.fn()
    const onSkip = vi.fn()
    const onChange = vi.fn()
    const onDelete = vi.fn()

    const rolls = [mockValidRoll, { ...mockValidRoll, roll_index: 2 }]

    renderWithProviders(
      <RollReviewPanel
        rolls={rolls}
        onConfirmAll={onConfirmAll}
        onSkip={onSkip}
        onChange={onChange}
        onDelete={onDelete}
      />
    )

    expect(screen.getByText(/2 rolls/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove roll 1/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove roll 2/i })).toBeInTheDocument()
  })
})
