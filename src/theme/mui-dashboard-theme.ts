/**
 * MUI v6 theme factory for the BJJ Evolution Dashboard.
 *
 * Reads from `material-tokens.ts` \u2014 the typed TS mirror of the
 * `template.html` CSS variables. MUI does not read CSS variables for
 * `palette` at theme-construction time, so the factory feeds it the
 * hex values directly.
 *
 * This factory is the ONLY seam between the typed token bundles and
 * MUI. `BJJDashboardPage` (PR 5) will be the only caller; it passes
 * the return of `useDashboardColorScheme()` as the `mode` argument.
 *
 * The follow-up `theme-context-unified` change replaces the body of
 * `useDashboardColorScheme` (NOT this file) to read from a React
 * context. The factory's contract stays the same.
 *
 * What's mapped (every assertion in `mui-dashboard-theme.test.ts` is
 * driven by one of these):
 *  - `palette.mode`                \u2190 `mode` arg
 *  - `palette.primary.main`        \u2190 `color.accent` (the Google-blue brand)
 *  - `palette.secondary.main`      \u2190 `category.submission` (brand secondary;
 *                                  `template.html` uses submission red for
 *                                  the secondary action accent)
 *  - `palette.info.main`           \u2190 `color.accent` (MUI's info color is
 *                                  not part of the token map; reuse accent)
 *  - `palette.success.main`        \u2190 `color.success`
 *  - `palette.warning.main`        \u2190 `color.warn`
 *  - `palette.error.main`          \u2190 `color.danger`
 *  - `palette.background.default`  \u2190 `color.bg` (page background)
 *  - `palette.background.paper`    \u2190 `color.surface` (widget card surface)
 *  - `palette.text.primary`        \u2190 `color.fg` (body text)
 *  - `palette.text.secondary`      \u2190 `color.fg2` (secondary text)
 *  - `palette.text.disabled`       \u2190 `color.muted` (disabled text)
 *  - `palette.divider`             \u2190 `color.border` (Paper/Card divider)
 *  - `typography.fontFamily`       \u2190 `typography.fontBody` (Roboto, Arial)
 *  - `shape.borderRadius`          \u2190 `radius.md` (12 \u2014 widget card radius)
 *
 * What's intentionally NOT mapped:
 *  - `typography.fontDisplay`      \u2014 MUI has no "display" slot; widgets
 *                                  use `sx={{ fontFamily: 'var(--font-display)' }}`
 *                                  to opt into Google Sans.
 *  - `spacing()`                   \u2014 MUI's default is 8px-based, but our
 *                                  tokens are 4px-based. Widgets use
 *                                  `var(--space-N)` in `sx` directly.
 *  - `palette.primary.light/dark/contrastText` \u2014 MUI auto-derives from
 *                                  `main`; we don't override.
 *  - `components.*` style overrides \u2014 defer to PR 5+ when widgets ship
 *                                  and we can assert on actual renders.
 *  - `accentHover` / `accentActive` \u2014 CSS `color-mix()` strings, not
 *                                  valid MUI palette values. Hover/active
 *                                  states stay in `material-dashboard.css`.
 *
 * Refs: REQ-BD11 (MUI mounting), REQ-BD12 (theme tokens from
 * `material-tokens.ts`), design.md \u00a78 (MUI coexistence), \u00a79 (theme shim).
 */
import { createTheme, type Theme } from '@mui/material/styles'
import { MATERIAL_TOKENS, tokensForScheme, type ColorScheme } from './material-tokens'

export function createDashboardTheme(mode: ColorScheme): Theme {
  const { color, category } = tokensForScheme(mode)

  return createTheme({
    palette: {
      mode,
      primary: { main: color.accent },
      secondary: { main: category.submission },
      info: { main: color.accent },
      success: { main: color.success },
      warning: { main: color.warn },
      error: { main: color.danger },
      background: {
        default: color.bg,
        paper: color.surface,
      },
      text: {
        primary: color.fg,
        secondary: color.fg2,
        disabled: color.muted,
      },
      divider: color.border,
    },
    typography: {
      fontFamily: MATERIAL_TOKENS.typography.fontBody,
    },
    shape: {
      borderRadius: MATERIAL_TOKENS.radius.md,
    },
  })
}
