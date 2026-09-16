import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { useTheme } from '@mui/material/styles'
import { renderWithMuiTheme } from '../renderWithMuiTheme'

function ThemeProbe() {
  const theme = useTheme()
  return <span data-testid="mode">{theme.palette.mode}</span>
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
})
