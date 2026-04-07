import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WodFormatSelector } from './WodFormatSelector'

// Import side effect to register all formats
import '../registry/formats/index'

describe('WodFormatSelector', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    mockOnChange.mockReset()
  })

  it('renders with "None (free text only)" default option', () => {
    render(<WodFormatSelector value="" onChange={mockOnChange} />)
    const select = screen.getByLabelText(/wod format/i)
    expect(select).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'None (free text only)' })).toBeInTheDocument()
  })

  it('renders all 6 formats as options', () => {
    render(<WodFormatSelector value="" onChange={mockOnChange} />)
    expect(screen.getByRole('option', { name: /amrap/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /for time/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /emom/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /tabata/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /ladder/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /rft/i })).toBeInTheDocument()
  })

  it('calls onChange when user selects a format', async () => {
    const user = userEvent.setup()
    render(<WodFormatSelector value="" onChange={mockOnChange} />)

    const select = screen.getByLabelText(/wod format/i)
    await user.selectOptions(select, 'amrap')

    expect(mockOnChange).toHaveBeenCalledWith('amrap')
  })

  it('disables the select when disabled prop is true', () => {
    render(<WodFormatSelector value="" onChange={mockOnChange} disabled />)
    const select = screen.getByLabelText(/wod format/i)
    expect(select).toBeDisabled()
  })

  it('shows the current value as selected', () => {
    render(<WodFormatSelector value="amrap" onChange={mockOnChange} />)
    const select = screen.getByLabelText(/wod format/i) as HTMLSelectElement
    expect(select.value).toBe('amrap')
  })
})
