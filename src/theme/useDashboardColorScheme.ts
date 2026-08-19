/**
 * Returns the active dashboard / Material color scheme.
 *
 * Consumes the app-wide `ThemeProvider` so BJJ Material surfaces stay in
 * sync with shadcn's `html.dark` class and the AppShell theme toggle.
 */
import { useTheme } from './ThemeContext'

export type DashboardColorScheme = 'light' | 'dark'

export function useDashboardColorScheme(): DashboardColorScheme {
  return useTheme().resolved
}
