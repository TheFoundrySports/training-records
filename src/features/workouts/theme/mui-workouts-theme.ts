import { createTheme, type Theme } from '@mui/material/styles'
import { palettes, tokensByMode, type ThemeMode } from './material-tokens'

// Re-export `ThemeMode` so consumers only need to import from this module.
export type { ThemeMode }

/**
 * Build the workouts MUI theme. Mirrors the shadcn theme tokens defined in
 * `src/index.css` (see `material-tokens.ts`). Returns a fresh `Theme` on each
 * call — memoize at the call site (the page uses `useMemo`).
 */
export function createWorkoutsTheme(mode: ThemeMode): Theme {
  const palette = palettes[mode]
  return createTheme({
    palette,
    typography: {
      fontFamily: tokensByMode.typography.fontFamily,
      h4: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.3 }, // matches shadcn text-2xl
      body1: { fontSize: '0.875rem', lineHeight: 1.5 }, // matches shadcn text-sm
      body2: { fontSize: '0.75rem', color: palette.text.secondary }, // matches shadcn text-xs muted
    },
    shape: {
      borderRadius: tokensByMode.radius.card,
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: { borderRadius: tokensByMode.radius.card },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: tokensByMode.radius.button,
            textTransform: 'none',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: tokensByMode.radius.chip },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderRadius: '9999px',
            textTransform: 'none',
            padding: '4px 12px',
          },
        },
      },
    },
  })
}

/**
 * Read the shadcn dark-mode class from `<html>` and return the matching MUI
 * mode. Used by the workouts list page to keep MUI in sync with the rest of
 * the app (which uses shadcn's `<html class="dark">` pattern).
 *
 * Returns `'light'` when running outside a browser (SSR / Vitest jsdom without
 * `document`).
 */
export function readShadcnDarkMode(): ThemeMode {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}
