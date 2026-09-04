import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { WorkoutTypePicker, WORKOUT_TYPE_OPTIONS } from './WorkoutTypePicker'

function renderPicker(initialEntries: string[] = ['/workouts/new']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <WorkoutTypePicker />
    </MemoryRouter>,
  )
}

describe('WorkoutTypePicker — spec scenarios (A1–A9)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('A1 renders two option cards', () => {
    renderPicker()
    expect(WORKOUT_TYPE_OPTIONS).toHaveLength(2)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
  })

  it('A1 grid container is present (responsive via MUI Box sx)', () => {
    renderPicker()
    expect(screen.getByTestId('picker-grid')).toBeInTheDocument()
  })

  it('A2 cards use the design system .widget CSS class for visual styling', () => {
    renderPicker()
    const widgets = document.getElementsByClassName('widget')
    expect(widgets).toHaveLength(2)
  })

  it('A3 no break-* utility applied to card copy', () => {
    renderPicker()
    const allHtml = document.documentElement.innerHTML
    expect(allHtml).not.toMatch(/break-words/)
    expect(allHtml).not.toMatch(/break-all/)
    expect(allHtml).not.toMatch(/hyphens-auto/)
  })

  it('A4 cards are focusable anchors; visible focus ring provided by MaterialScope :focus-visible', () => {
    renderPicker()
    const links = screen.getAllByRole('link')
    links.forEach((link) => {
      expect(link.tabIndex).not.toBe(-1)
    })
  })

  it('A5 CrossFit card navigates to /workouts/new/crossfit on activation', async () => {
    const user = userEvent.setup()
    renderPicker()
    const link = screen.getByRole('link', { name: /CrossFit \/ Functional/i })
    expect(link).toHaveAttribute('href', '/workouts/new/crossfit')
    await user.click(link)
  })

  it('A5 BJJ card navigates to /bjj/new on activation', async () => {
    const user = userEvent.setup()
    renderPicker()
    const link = screen.getByRole('link', { name: /Brazilian Jiu-Jitsu/i })
    expect(link).toHaveAttribute('href', '/bjj/new')
    await user.click(link)
  })

  it('A6 each card carries exactly one lucide-react SVG inside .widget-icon', () => {
    renderPicker()
    const icons = document.getElementsByClassName('widget-icon')
    expect(icons).toHaveLength(2)
    Array.from(icons).forEach((icon) => {
      expect(icon.querySelector('svg')).toBeInTheDocument()
    })
  })

  it('A7 options come from WORKOUT_TYPE_OPTIONS constant iterated via .map()', () => {
    renderPicker()
    expect(WORKOUT_TYPE_OPTIONS).toHaveLength(2)
    expect(WORKOUT_TYPE_OPTIONS.map((o) => o.id)).toEqual(['crossfit', 'bjj'])
    expect(WORKOUT_TYPE_OPTIONS.map((o) => o.href)).toEqual([
      '/workouts/new/crossfit',
      '/bjj/new',
    ])
  })

  it('A9 copy is unchanged: titles and subtitles match spec verbatim', () => {
    renderPicker()
    expect(screen.getByText('CrossFit / Functional')).toBeInTheDocument()
    expect(screen.getByText('WOD-based training')).toBeInTheDocument()
    expect(screen.getByText('Brazilian Jiu-Jitsu')).toBeInTheDocument()
    expect(screen.getByText('Section-based technique training')).toBeInTheDocument()
  })

  it('A1 heading "Log Workout" rendered as <h1> via MUI Typography', () => {
    renderPicker()
    const heading = screen.getByRole('heading', { name: 'Log Workout' })
    expect(heading).toBeInTheDocument()
    expect(heading.tagName).toBe('H1')
  })
})
