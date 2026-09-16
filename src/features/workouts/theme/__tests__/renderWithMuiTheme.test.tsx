import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { useTheme } from '@mui/material/styles'
import { renderWithMuiTheme } from '../renderWithMuiTheme'

function ThemeProbe() {
  const theme = useTheme()
  return <span data-testid="mode">{theme.palette.mode}</span>
}

function PaletteProbe({ slot }: { slot: string }) {
  const theme = useTheme()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value = (theme.palette as any)[slot]
  return <span data-testid={`palette-${slot}`}>{value?.main ?? 'missing'}</span>
}

describe('renderWithMuiTheme', () => {
  it('renders the child element', () => {
    renderWithMuiTheme(<div data-testid="child">hello</div>)
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByTestId('child')).toHaveTextContent('hello')
  })

  it('wraps children in MUI ThemeProvider (default mode = light)', () => {
    renderWithMuiTheme(<ThemeProbe />)
    expect(screen.getByTestId('mode')).toHaveTextContent('light')
  })

  it('uses dark theme when mode = dark', () => {
    renderWithMuiTheme(<ThemeProbe />, { mode: 'dark' })
    expect(screen.getByTestId('mode')).toHaveTextContent('dark')
  })

  // Category palette augmentation — `palette.crossfit`, `palette.functional`,
  // `palette.bjj` are typed via `palette-augmentation.d.ts`. These tests
  // catch regressions if someone removes the augmentation or the runtime
  // values from `material-tokens.ts`.
  describe('category palette augmentation', () => {
    it('exposes palette.crossfit (orange) in light mode', () => {
      renderWithMuiTheme(<PaletteProbe slot="crossfit" />)
      expect(screen.getByTestId('palette-crossfit')).toHaveTextContent('#ea580c')
    })

    it('exposes palette.functional (cyan) in light mode', () => {
      renderWithMuiTheme(<PaletteProbe slot="functional" />)
      expect(screen.getByTestId('palette-functional')).toHaveTextContent('#0891b2')
    })

    it('exposes palette.bjj (violet) in light mode', () => {
      renderWithMuiTheme(<PaletteProbe slot="bjj" />)
      expect(screen.getByTestId('palette-bjj')).toHaveTextContent('#7c3aed')
    })

    it('exposes palette.crossfit (brighter orange) in dark mode', () => {
      renderWithMuiTheme(<PaletteProbe slot="crossfit" />, { mode: 'dark' })
      expect(screen.getByTestId('palette-crossfit')).toHaveTextContent('#fb923c')
    })

    it('exposes palette.functional (brighter cyan) in dark mode', () => {
      renderWithMuiTheme(<PaletteProbe slot="functional" />, { mode: 'dark' })
      expect(screen.getByTestId('palette-functional')).toHaveTextContent('#22d3ee')
    })

    it('exposes palette.bjj (brighter violet) in dark mode', () => {
      renderWithMuiTheme(<PaletteProbe slot="bjj" />, { mode: 'dark' })
      expect(screen.getByTestId('palette-bjj')).toHaveTextContent('#a78bfa')
    })

    it('exposes palette.info (blue) and palette.success (green)', () => {
      // MUI standard colors so `color="info"` and `color="success"` are real
      // colors (not black like primary when the theme is shadcn-aligned).
      renderWithMuiTheme(
        <>
          <PaletteProbe slot="info" />
          <PaletteProbe slot="success" />
        </>,
      )
      expect(screen.getByTestId('palette-info')).toHaveTextContent('#0288d1')
      expect(screen.getByTestId('palette-success')).toHaveTextContent('#2e7d32')
    })
  })
})
