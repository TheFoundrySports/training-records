import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TechniquePracticeBadge } from '../components/TechniquePracticeBadge'

function renderBadge(props: { techniqueName?: string; count: number; threshold: number; isLearned: boolean; onClick: () => void }) {
  return render(<TechniquePracticeBadge {...props} />)
}

describe('TechniquePracticeBadge', () => {
  describe('color coding (from design spec)', () => {
    it('renders gray when count is 0', () => {
      const { container } = renderBadge({
        count: 0,
        threshold: 10,
        isLearned: false,
        onClick: vi.fn(),
      })
      const badge = container.querySelector('[data-testid="practice-badge"]')
      expect(badge).not.toBeNull()
      expect(badge!.className).toMatch(/bg-gray-100/)
      expect(badge!.className).toMatch(/text-gray-500/)
    })

    it('renders amber when count is between 0 and threshold', () => {
      const { container } = renderBadge({
        count: 5,
        threshold: 10,
        isLearned: false,
        onClick: vi.fn(),
      })
      const badge = container.querySelector('[data-testid="practice-badge"]')
      expect(badge).not.toBeNull()
      expect(badge!.className).toMatch(/bg-amber-100/)
      expect(badge!.className).toMatch(/text-amber-700/)
    })

    it('renders green when count >= threshold', () => {
      const { container } = renderBadge({
        count: 10,
        threshold: 10,
        isLearned: true,
        onClick: vi.fn(),
      })
      const badge = container.querySelector('[data-testid="practice-badge"]')
      expect(badge).not.toBeNull()
      expect(badge!.className).toMatch(/bg-green-500/)
      expect(badge!.className).toMatch(/text-white/)
    })
  })

  describe('aria-label', () => {
    it('includes count, threshold, and validation status', () => {
      renderBadge({
        techniqueName: 'Knee Slide Pass',
        count: 7,
        threshold: 10,
        isLearned: false,
        onClick: vi.fn(),
      })
      const badge = screen.getByTestId('practice-badge')
      expect(badge).toHaveAttribute(
        'aria-label',
        'Knee Slide Pass practiced 7 out of 10 times, not validated'
      )
    })

    it('says validated when isLearned is true', () => {
      renderBadge({
        techniqueName: 'Armbar',
        count: 10,
        threshold: 10,
        isLearned: true,
        onClick: vi.fn(),
      })
      const badge = screen.getByTestId('practice-badge')
      expect(badge).toHaveAttribute(
        'aria-label',
        'Armbar practiced 10 out of 10 times, validated'
      )
    })
  })

  describe('onClick propagation', () => {
    it('calls onClick when badge is clicked', () => {
      const onClick = vi.fn()
      renderBadge({
        count: 5,
        threshold: 10,
        isLearned: false,
        onClick,
      })
      fireEvent.click(screen.getByTestId('practice-badge'))
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('is keyboard accessible (tabIndex=0, role=button)', () => {
      renderBadge({
        count: 5,
        threshold: 10,
        isLearned: false,
        onClick: vi.fn(),
      })
      const badge = screen.getByTestId('practice-badge')
      expect(badge).toHaveAttribute('role', 'button')
      expect(badge).toHaveAttribute('tabIndex', '0')
    })

    it('calls onClick on Enter keypress', () => {
      const onClick = vi.fn()
      renderBadge({
        count: 5,
        threshold: 10,
        isLearned: false,
        onClick,
      })
      fireEvent.keyDown(screen.getByTestId('practice-badge'), { key: 'Enter' })
      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('display format', () => {
    it('shows count/threshold in badge label', () => {
      renderBadge({
        techniqueName: 'Triangle',
        count: 7,
        threshold: 10,
        isLearned: false,
        onClick: vi.fn(),
      })
      expect(screen.getByText('7/10')).toBeInTheDocument()
    })
  })
})