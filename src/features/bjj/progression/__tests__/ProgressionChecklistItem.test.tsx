import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ProgressionItem } from '../types/belt-progression.types'
import { ProgressionChecklistItem } from '../components/ProgressionChecklistItem'

function renderItem(props: {
  item: ProgressionItem
  isComplete: boolean
  onToggle: (sectionId: string, itemId: string, isComplete: boolean) => void
  sectionId: string
  practiceData?: { count: number; threshold: number; isLearned: boolean } | null
  onPracticeClick?: () => void
}) {
  return render(<ProgressionChecklistItem {...props} />)
}

const mockItem: ProgressionItem = {
  id: 'tecnicas-0',
  label: 'Double Leg',
  category: 'takedown',
}

describe('ProgressionChecklistItem', () => {
  describe('basic rendering', () => {
    it('renders label and checkbox', () => {
      const onToggle = vi.fn()
      renderItem({
        item: mockItem,
        isComplete: false,
        onToggle,
        sectionId: 'tecnicas',
      })

      expect(screen.getByText('Double Leg')).toBeInTheDocument()
      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('calls onToggle when checkbox changes', () => {
      const onToggle = vi.fn()
      renderItem({
        item: mockItem,
        isComplete: false,
        onToggle,
        sectionId: 'tecnicas',
      })

      fireEvent.click(screen.getByRole('checkbox'))
      expect(onToggle).toHaveBeenCalledWith('tecnicas', 'tecnicas-0', true)
    })
  })

  describe('practice badge (practiceData prop)', () => {
    it('renders TechniquePracticeBadge when practiceData is provided', () => {
      const onToggle = vi.fn()
      const onPracticeClick = vi.fn()
      renderItem({
        item: mockItem,
        isComplete: false,
        onToggle,
        sectionId: 'tecnicas',
        practiceData: { count: 7, threshold: 10, isLearned: false },
        onPracticeClick,
      })

      const badge = screen.getByTestId('practice-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('7/10')
    })

    it('badge onClick calls onPracticeClick', () => {
      const onToggle = vi.fn()
      const onPracticeClick = vi.fn()
      renderItem({
        item: mockItem,
        isComplete: false,
        onToggle,
        sectionId: 'tecnicas',
        practiceData: { count: 7, threshold: 10, isLearned: false },
        onPracticeClick,
      })

      fireEvent.click(screen.getByTestId('practice-badge'))
      expect(onPracticeClick).toHaveBeenCalledTimes(1)
    })

    it('does not render badge when practiceData is null', () => {
      const onToggle = vi.fn()
      renderItem({
        item: mockItem,
        isComplete: false,
        onToggle,
        sectionId: 'tecnicas',
        practiceData: null,
      })

      expect(screen.queryByTestId('practice-badge')).not.toBeInTheDocument()
    })
  })
})