/**
 * Sequence-timeline contract for `RollFlowWidget` (mat-bjj-app.html).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithMuiTheme } from '@/test-utils/renderWithMuiTheme'
import { within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RollFlowWidget } from '../../components/RollFlowWidget'
import type { RollFlowData, RollFlowEdge } from '../../types/dashboard.types'
import { FLOW_LANE_LIMIT, FLOW_STEPS } from '../../utils/buildRollFlowLanes'

function buildEdges(): RollFlowEdge[] {
  return [
    { from: 'closed_guard', to: 'mount', count: 10, pct: 100 },
    { from: 'half_guard', to: 'side_control', count: 7, pct: 70 },
    { from: 'open_guard', to: 'back_control', count: 6, pct: 60 },
    { from: 'standing', to: 'turtle', count: 5, pct: 50 },
    { from: 'mount', to: 'back_control', count: 4, pct: 40 },
    { from: 'side_control', to: null, count: 3, pct: 30 },
    { from: 'turtle', to: 'knee_on_belly', count: 2, pct: 20 },
  ]
}

function buildRollFlowData(overrides: Partial<RollFlowData> = {}): RollFlowData {
  return {
    edges: buildEdges(),
    total_transitions: 37,
    total_rolls: 50,
    top_n: 7,
    ...overrides,
  }
}

const mockNavigate = vi.fn()

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

beforeEach(() => {
  mockNavigate.mockClear()
})

describe('RollFlowWidget — sequence lanes (mat-bjj-app.html)', () => {
  it('renders the six stage headers and one lane per top edge (capped at 5)', () => {
    const { container } = renderWithMuiTheme(
      <RollFlowWidget data={buildRollFlowData()} window="30d" />,
    )
    const steps = container.querySelectorAll('.flow-step')
    expect(steps).toHaveLength(FLOW_STEPS.length)
    expect(steps[3]?.textContent).toBe('Peak')
    expect(steps[3]?.classList.contains('now')).toBe(true)
    expect(container.querySelectorAll('.flow-lane').length).toBe(FLOW_LANE_LIMIT)
  })

  it('shows share-of-rolls on the left and a bar width from edge.pct', () => {
    const { container } = renderWithMuiTheme(
      <RollFlowWidget data={buildRollFlowData()} />,
    )
    const firstLane = container.querySelector('.flow-lane') as HTMLElement
    expect(within(firstLane).getByText('20%')).toBeInTheDocument()
    const fill = firstLane.querySelector('.flow-lane-fill') as HTMLElement
    expect(fill.style.width).toBe('100%')
    expect(within(firstLane).getByText('CG')).toBeInTheDocument()
    expect(within(firstLane).getByText('Closed guard')).toBeInTheDocument()
    expect(firstLane.querySelectorAll('.flow-circle.peak').length).toBeGreaterThan(0)
  })

  it('renders each lane as a button and navigates to /workouts on click', async () => {
    const user = userEvent.setup()
    const { container } = renderWithMuiTheme(
      <RollFlowWidget data={buildRollFlowData()} />,
    )
    const lanes = container.querySelectorAll('.flow-lane')
    for (const lane of lanes) {
      expect(lane.tagName).toBe('BUTTON')
    }
    await user.click(lanes[0] as HTMLElement)
    expect(mockNavigate).toHaveBeenCalledWith('/workouts')
  })

  it('renders the most-common-finish summary from the top lane', () => {
    renderWithMuiTheme(
      <RollFlowWidget data={buildRollFlowData()} window="30d" />,
    )
    const summary = document.querySelector('.flow-summary') as HTMLElement
    expect(summary).not.toBeNull()
    expect(within(summary).getByText(/Finalización más común/i)).toBeInTheDocument()
    expect(within(summary).getByText(/Mount desde Closed guard/)).toBeInTheDocument()
  })

  it('renders no lanes when edges is empty', () => {
    const { container } = renderWithMuiTheme(
      <RollFlowWidget data={buildRollFlowData({ edges: [] })} />,
    )
    expect(container.querySelectorAll('.flow-lane').length).toBe(0)
    expect(container.querySelector('.flow-summary')).toBeNull()
  })
})
