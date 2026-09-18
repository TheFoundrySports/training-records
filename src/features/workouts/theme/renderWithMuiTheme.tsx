import type { ReactElement } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import { createWorkoutsTheme, type ThemeMode } from './mui-workouts-theme'

interface RenderWithMuiThemeOptions extends Omit<RenderOptions, 'wrapper'> {
  mode?: ThemeMode
}

/**
 * Render a component inside an MUI ThemeProvider + CssBaseline, using the
 * workouts theme factory. Use this in tests that depend on MUI theme context
 * (e.g. `useTheme()`, `sx` palette tokens).
 */
export function renderWithMuiTheme(
  ui: ReactElement,
  options: RenderWithMuiThemeOptions = {},
): RenderResult {
  const { mode = 'light', ...rest } = options
  const theme = createWorkoutsTheme(mode)
  return render(ui, {
    wrapper: ({ children }) => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    ),
    ...rest,
  })
}
