/**
 * RED tests for `LastTechniquesWidget` \u2014 the first of 5 dashboard widgets.
 *
 * Contract (T5.12 + T5.13 + REQ-BD6):
 *  - Hero stat: the total practice count across all rows (e.g. "47
 *    total practices") rendered with a <CountUp> animated number.
 *  - Renders 1 row per `data.rows` item (up to 10).
 *  - Each row shows the technique name + practice count + relative-time
 *    label from `last_practiced_at` (Intl.RelativeTimeFormat('en')).
 *  - The category chip renders with the right `data-cat` attribute so the
 *    .chip[data-cat='submission'] CSS tinting applies (REQ-PV5).
 *  - Clicking a row opens the TechniquePracticeModal with the row's
 *    technique_id (REQ-BD6: "Last techniques row opens
 *    TechniquePracticeModal").
 *  - When data.rows is empty, the widget shows its empty state (the
 *    shell-level empty slot already covers this, but the widget still
 *    must not crash on empty input).
 *
 * RED confirmed: LastTechniquesWidget module doesn't exist yet.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithMuiTheme } from '@/test-utils/renderWithMuiTheme'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LastTechniquesWidget } from '../../components/LastTechniquesWidget'
import type { LastTechniquesData } from '../../types/dashboard.types'

// Mock usePrefersReducedMotion so CountUp renders the final value
// immediately (no animation). jsdom doesn't fire rAF reliably and
// the dashboard tests should assert the FINAL state, not the
// mid-animation value.
const mockUsePrefersReducedMotion = vi.fn(() => true)
vi.mock('@/components/react-bits/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => mockUsePrefersReducedMotion(),
}))

beforeEach(() => {
  mockUsePrefersReducedMotion.mockReturnValue(true)
})

// Mock the modal so we can assert it gets called with the right technique_id
// without needing to mount the full modal (which depends on a bjj_techniques
// query + a Radix Dialog).
vi.mock(
  '@/features/bjj/progression/components/TechniquePracticeModal',
  () => ({
    TechniquePracticeModal: ({
      techniqueId,
      open,
    }: {
      techniqueId: string
      open: boolean
      techniqueName: string
      onClose: () => void
    }) =>
      open ? (
        <div data-testid="practice-modal" data-technique-id={techniqueId}>
          Practice Modal
        </div>
      ) : null,
  }),
)

function buildRows(): LastTechniquesData['rows'] {
  return [
    {
      technique_id: 'tech-1',
      technique_name: 'Triangle Choke',
      category: 'submission',
      last_practiced_at: '2026-06-10T10:00:00.000Z',
      practice_count: 12,
    },
    {
      technique_id: 'tech-2',
      technique_name: 'Scissor Sweep',
      category: 'guard',
      last_practiced_at: '2026-06-09T10:00:00.000Z',
      practice_count: 7,
    },
    {
      technique_id: 'tech-3',
      technique_name: 'Hip Escape',
      category: 'escape',
      last_practiced_at: '2026-06-08T10:00:00.000Z',
      practice_count: 3,
    },
  ]
}

describe('LastTechniquesWidget \u2014 hero stat + row list + modal drill-down (T5.12, REQ-BD6)', () => {
  it('renders the hero stat with the total practice count', () => {
    renderWithMuiTheme(<LastTechniquesWidget data={{ rows: buildRows() }} />)
    // 12 + 7 + 3 = 22
    expect(screen.getByText('22')).toBeInTheDocument()
  })

  it('renders one row per data row', () => {
    renderWithMuiTheme(<LastTechniquesWidget data={{ rows: buildRows() }} />)
    expect(screen.getByText('Triangle Choke')).toBeInTheDocument()
    expect(screen.getByText('Scissor Sweep')).toBeInTheDocument()
    expect(screen.getByText('Hip Escape')).toBeInTheDocument()
  })

  it('renders the per-row practice count', () => {
    renderWithMuiTheme(<LastTechniquesWidget data={{ rows: buildRows() }} />)
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders each category chip with the right data-cat attribute (REQ-PV5)', () => {
    renderWithMuiTheme(<LastTechniquesWidget data={{ rows: buildRows() }} />)
    expect(document.querySelector('.chip[data-cat="submission"]')).not.toBeNull()
    expect(document.querySelector('.chip[data-cat="guard"]')).not.toBeNull()
    expect(document.querySelector('.chip[data-cat="escape"]')).not.toBeNull()
  })

  it('renders a relative-time label (Intl.RelativeTimeFormat("en"))', () => {
    const { container } = renderWithMuiTheme(<LastTechniquesWidget data={{ rows: buildRows() }} />)
    // The exact wording depends on the gap (16 days rounds to "last month"
    // in `relativeTimeEn`). We just assert the label is non-empty and
    // contains an English relative-time phrase.
    const matches = container.querySelectorAll('.tech-meta')
    expect(matches.length).toBe(3)
    for (const node of matches) {
      expect(node.textContent?.trim().length).toBeGreaterThan(0)
      expect(node.textContent).toMatch(/ago|yesterday|today|now|second|minute|hour|day|week|month|year/i)
    }
  })

  it('clicking a row opens TechniquePracticeModal with that row\u2019s technique_id (REQ-BD6)', async () => {
    const user = userEvent.setup()
    renderWithMuiTheme(<LastTechniquesWidget data={{ rows: buildRows() }} />)

    // No modal yet
    expect(screen.queryByTestId('practice-modal')).toBeNull()

    // Click the Triangle Choke row
    await user.click(screen.getByRole('button', { name: /triangle choke/i }))

    const modal = screen.getByTestId('practice-modal')
    expect(modal).toHaveAttribute('data-technique-id', 'tech-1')
  })

  it('does not crash on empty rows', () => {
    renderWithMuiTheme(<LastTechniquesWidget data={{ rows: [] }} />)
    // Hero should be 0 (still rendered)
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})