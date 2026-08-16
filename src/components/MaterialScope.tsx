/**
 * MaterialScope — Material UI theme boundary for BJJ features.
 *
 * Wraps children in:
 *  1. MUI ThemeProvider with dashboard theme (from material-tokens.ts)
 *  2. ScopedCssBaseline (NOT global CssBaseline — no body/html leak)
 *  3. `.bjj-dashboard` class scope for Material CSS variables
 *
 * Design decisions:
 *  - D6: ScopedCssBaseline prevents global body resets that would conflict
 *    with shadcn pages. The CSS variable system is class-scoped already.
 *  - D7: Theme modules moved to src/theme/ (shared) from dashboard feature.
 *  - D8: Dark mode uses useDashboardColorScheme() (prefers-color-scheme).
 *    No in-app toggle until the deferred `theme-context-unified` change.
 *
 * Usage:
 * ```tsx
 * function BJJWorkoutFormPage() {
 *   return (
 *     <MaterialScope>
 *       <form>...</form>
 *     </MaterialScope>
 *   )
 * }
 * ```
 *
 * Refs: REQ-FRM3 (Material scope), design §D6-D8, tasks §4.8-4.9.
 */
import { ThemeProvider, ScopedCssBaseline } from '@mui/material'
import { createDashboardTheme } from '@/theme/mui-dashboard-theme'
import { useDashboardColorScheme } from '@/theme/useDashboardColorScheme'
import '@/theme/load-dashboard-styles'

interface MaterialScopeProps {
  children: React.ReactNode
}

export function MaterialScope({ children }: MaterialScopeProps) {
  const colorScheme = useDashboardColorScheme()
  const theme = createDashboardTheme(colorScheme)

  return (
    <ThemeProvider theme={theme}>
      <ScopedCssBaseline>
        <div className="bjj-dashboard">{children}</div>
      </ScopedCssBaseline>
    </ThemeProvider>
  )
}
