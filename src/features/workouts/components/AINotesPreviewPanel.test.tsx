import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AINotesPreviewPanel } from './AINotesPreviewPanel'

// Importing the beforeEach from test util would conflict, so define it here
const mockOnApply = vi.fn()
const mockOnDiscard = vi.fn()

beforeEach(() => {
  mockOnApply.mockReset()
  mockOnDiscard.mockReset()
})

describe('AINotesPreviewPanel', () => {
  it('renders enhanced_notes text', () => {
    render(
      <AINotesPreviewPanel
        enhanced_notes="Step 1: Warm up\nStep 2: Main workout"
        onApply={mockOnApply}
        onDiscard={mockOnDiscard}
      />,
    )

    // Use regex to match text that contains the content (newline preserved in DOM)
    expect(screen.getByText(/Step 1: Warm up/)).toBeInTheDocument()
    expect(screen.getByText(/Step 2: Main workout/)).toBeInTheDocument()
  })

  it('renders with AI Enhanced label', () => {
    render(
      <AINotesPreviewPanel
        enhanced_notes="Some enhanced text"
        onApply={mockOnApply}
        onDiscard={mockOnDiscard}
      />,
    )

    expect(screen.getByText(/ai enhanced/i)).toBeInTheDocument()
  })

  it('Apply button calls onApply with correct text', async () => {
    const user = userEvent.setup()
    render(
      <AINotesPreviewPanel
        enhanced_notes="Apply this text"
        onApply={mockOnApply}
        onDiscard={mockOnDiscard}
      />,
    )

    await user.click(screen.getByRole('button', { name: /apply/i }))

    expect(mockOnApply).toHaveBeenCalledWith('Apply this text')
    expect(mockOnApply).toHaveBeenCalledTimes(1)
  })

  it('Discard button calls onDiscard', async () => {
    const user = userEvent.setup()
    render(
      <AINotesPreviewPanel
        enhanced_notes="Discard this text"
        onApply={mockOnApply}
        onDiscard={mockOnDiscard}
      />,
    )

    await user.click(screen.getByRole('button', { name: /discard/i }))

    expect(mockOnDiscard).toHaveBeenCalledTimes(1)
    expect(mockOnApply).not.toHaveBeenCalled()
  })

  it('Apply button is not disabled', () => {
    render(
      <AINotesPreviewPanel
        enhanced_notes="Test text"
        onApply={mockOnApply}
        onDiscard={mockOnDiscard}
      />,
    )

    expect(screen.getByRole('button', { name: /apply/i })).not.toBeDisabled()
  })

  it('Discard button is not disabled', () => {
    render(
      <AINotesPreviewPanel
        enhanced_notes="Test text"
        onApply={mockOnApply}
        onDiscard={mockOnDiscard}
      />,
    )

    expect(screen.getByRole('button', { name: /discard/i })).not.toBeDisabled()
  })

  it('renders with card styling', () => {
    const { container } = render(
      <AINotesPreviewPanel
        enhanced_notes="Styled text"
        onApply={mockOnApply}
        onDiscard={mockOnDiscard}
      />,
    )

    const panel = container.querySelector('.card')
    expect(panel).not.toBeNull()
  })
})
