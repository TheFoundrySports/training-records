import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { PasswordStrengthMeter } from '../PasswordStrengthMeter'

// ── Mock password-validation lib ──────────────────────────────────────────────

vi.mock('@/features/auth/lib/password-validation', () => ({
  calculatePasswordStrength: vi.fn(),
}))

import { calculatePasswordStrength } from '@/features/auth/lib/password-validation'

const mockCalculateStrength = calculatePasswordStrength as ReturnType<typeof vi.fn>

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PasswordStrengthMeter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when password is empty', () => {
    const { container } = render(<PasswordStrengthMeter password="" />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when password is not provided', () => {
    const { container } = render(<PasswordStrengthMeter password="" />)
    expect(container.firstChild).toBeNull()
  })

  it('displays very weak strength for score 0', () => {
    mockCalculateStrength.mockReturnValue(0)
    const { getByText } = render(<PasswordStrengthMeter password="abc" />)

    expect(getByText('Very Weak')).toBeInTheDocument()
  })

  it('displays weak strength for score 1', () => {
    mockCalculateStrength.mockReturnValue(1)
    const { getByText } = render(<PasswordStrengthMeter password="password1!" />)

    expect(getByText('Weak')).toBeInTheDocument()
  })

  it('displays fair strength for score 2', () => {
    mockCalculateStrength.mockReturnValue(2)
    const { getByText } = render(<PasswordStrengthMeter password="Password1!" />)

    expect(getByText('Fair')).toBeInTheDocument()
  })

  it('displays good strength for score 3', () => {
    mockCalculateStrength.mockReturnValue(3)
    const { getByText } = render(<PasswordStrengthMeter password="StrongPassword123!" />)

    expect(getByText('Good')).toBeInTheDocument()
  })

  it('displays strong strength for score 4', () => {
    mockCalculateStrength.mockReturnValue(4)
    const { getByText } = render(<PasswordStrengthMeter password="VeryStrongP@ssw0rd!" />)

    expect(getByText('Strong')).toBeInTheDocument()
  })

  it('calls calculatePasswordStrength with the password', () => {
    mockCalculateStrength.mockReturnValue(0)
    render(<PasswordStrengthMeter password="test123" />)

    expect(mockCalculateStrength).toHaveBeenCalledWith('test123')
  })

  it('contains progress bar div', () => {
    mockCalculateStrength.mockReturnValue(2)
    const { container } = render(<PasswordStrengthMeter password="Password1!" />)

    // Should have a div with overflow-hidden (for progress bar background)
    expect(container.querySelector('.overflow-hidden')).toBeInTheDocument()
  })

  it('renders with correct width percentage for strength 0', () => {
    mockCalculateStrength.mockReturnValue(0)
    const { container } = render(<PasswordStrengthMeter password="abc" />)

    // Width should be 20% for strength 0 ((0 + 1) * 20 = 20)
    const progressBar = container.querySelector('div[style*="width"]')
    expect(progressBar).toHaveStyle({ width: '20%' })
  })

  it('renders with correct width percentage for strength 2', () => {
    mockCalculateStrength.mockReturnValue(2)
    const { container } = render(<PasswordStrengthMeter password="Password1!" />)

    // Width should be 60% for strength 2 ((2 + 1) * 20 = 60)
    const progressBar = container.querySelector('div[style*="width"]')
    expect(progressBar).toHaveStyle({ width: '60%' })
  })

  it('renders with correct width percentage for strength 4', () => {
    mockCalculateStrength.mockReturnValue(4)
    const { container } = render(<PasswordStrengthMeter password="VeryStrong!" />)

    // Width should be 100% for strength 4 ((4 + 1) * 20 = 100)
    const progressBar = container.querySelector('div[style*="width"]')
    expect(progressBar).toHaveStyle({ width: '100%' })
  })
})
