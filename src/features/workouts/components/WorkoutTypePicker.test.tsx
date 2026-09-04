import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'

// Mock react-router so useNavigate is a vi.fn() we can assert against.
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
  }
})

import { WorkoutTypePicker } from './WorkoutTypePicker'
import * as reactRouter from 'react-router'

const mockedUseNavigate = vi.mocked(reactRouter.useNavigate)

const PICKER_SOURCE_PATH = resolve(__dirname, './WorkoutTypePicker.tsx')

function renderPicker() {
  return render(
    <MemoryRouter>
      <WorkoutTypePicker />
    </MemoryRouter>,
  )
}

function getSource(): string {
  return readFileSync(PICKER_SOURCE_PATH, 'utf8')
}

describe('WorkoutTypePicker — spec scenarios (A1–A7)', () => {
  beforeEach(() => {
    mockedUseNavigate.mockClear()
    mockedUseNavigate.mockReturnValue(vi.fn())
  })

  it('A1.scenario1_mobileSingleColumn_rendersGridCols1', () => {
    renderPicker()
    const heading = screen.getByRole('heading', { name: /log workout/i })
    const grid = heading.parentElement?.querySelector('div.grid')
    expect(grid).not.toBeNull()
    expect(grid!.className).toMatch(/\bgrid-cols-1\b/)
  })

  it('A1.scenario2_smTwoColumn_rendersSmGridCols2', () => {
    renderPicker()
    const heading = screen.getByRole('heading', { name: /log workout/i })
    const grid = heading.parentElement?.querySelector('div.grid')
    expect(grid).not.toBeNull()
    expect(grid!.className).toMatch(/\bsm:grid-cols-2\b/)
  })

  it('A2.scenario3_gapAtLeastOneRem', () => {
    renderPicker()
    const heading = screen.getByRole('heading', { name: /log workout/i })
    const grid = heading.parentElement?.querySelector('div.grid')
    expect(grid).not.toBeNull()
    expect(grid!.className).toMatch(/\bgap-4\b/)
    expect(grid!.className).toMatch(/\bsm:gap-6\b/)
  })

  it('A3.scenario4_noMidWordBreakClass_inSource', () => {
    const source = getSource()
    expect(source).not.toMatch(/\bbreak-words\b/)
    expect(source).not.toMatch(/\bbreak-all\b/)
    expect(source).not.toMatch(/\bbreak-keep\b/)
  })

  it('A4.scenario5_firstCardFocusRingTokens', () => {
    renderPicker()
    const firstCard = screen.getByRole('button', { name: /crossfit.*functional/i })
    expect(firstCard.className).toMatch(/\bfocus-visible:outline-none\b/)
    expect(firstCard.className).toMatch(/\bfocus-visible:ring-2\b/)
    expect(firstCard.className).toMatch(/\bfocus-visible:ring-ring\b/)
  })

  it('A4.scenario6_secondCardFocusRingTokens', () => {
    renderPicker()
    const secondCard = screen.getByRole('button', { name: /brazilian jiu-jitsu/i })
    expect(secondCard.className).toMatch(/\bfocus-visible:outline-none\b/)
    expect(secondCard.className).toMatch(/\bfocus-visible:ring-2\b/)
    expect(secondCard.className).toMatch(/\bfocus-visible:ring-ring\b/)
  })

  it('A5.scenario7_crossfitClick_navigatesToCrossfit', async () => {
    const user = userEvent.setup()
    renderPicker()
    const mockNav = mockedUseNavigate.mock.results[0]?.value as ReturnType<typeof vi.fn>
    await user.click(screen.getByRole('button', { name: /crossfit.*functional/i }))
    expect(mockNav).toHaveBeenCalledWith('/workouts/new/crossfit')
  })

  it('A5.scenario8_crossfitKeyboard_navigatesToCrossfit_viaEnterAndSpace', async () => {
    const user = userEvent.setup()
    renderPicker()
    const firstCard = screen.getByRole('button', { name: /crossfit.*functional/i })
    firstCard.focus()

    const mockNav = mockedUseNavigate.mock.results[0]?.value as ReturnType<typeof vi.fn>

    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(mockNav).toHaveBeenCalledWith('/workouts/new/crossfit')
    expect(mockNav.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('A5.scenario9_bjjClick_navigatesToBjjNew', async () => {
    const user = userEvent.setup()
    renderPicker()
    const mockNav = mockedUseNavigate.mock.results[0]?.value as ReturnType<typeof vi.fn>
    await user.click(screen.getByRole('button', { name: /brazilian jiu-jitsu/i }))
    expect(mockNav).toHaveBeenCalledWith('/bjj/new')
  })

  it('A5.scenario10_bjjKeyboard_navigatesToBjjNew_viaEnterAndSpace', async () => {
    const user = userEvent.setup()
    renderPicker()
    const secondCard = screen.getByRole('button', { name: /brazilian jiu-jitsu/i })
    secondCard.focus()

    const mockNav = mockedUseNavigate.mock.results[0]?.value as ReturnType<typeof vi.fn>

    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(mockNav).toHaveBeenCalledWith('/bjj/new')
    expect(mockNav.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('A6.scenario11_oneLucideSvgPerCard_andNoNewDep', () => {
    renderPicker()
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(2)
    for (const button of buttons) {
      const svgs = button.querySelectorAll('svg')
      expect(svgs.length).toBe(1)
    }

    // No new dependency added by the picker change.
    const source = getSource()
    expect(source).toMatch(/from\s+['"]lucide-react['"]/)
  })

  it('A7.scenario12_constantIteratedByMap_rendersExactlyTwoButtons', () => {
    const source = getSource()
    expect(source).toMatch(/WORKOUT_TYPE_OPTIONS/)
    expect(source).toMatch(/\.map\(/)

    renderPicker()
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(2)
  })
})
