/**
 * RED tests for `createDashboardTheme(mode)`.
 *
 * The factory is the single seam between the typed token bundles
 * (`material-tokens.ts`) and MUI v6's `createTheme`. It is the ONLY
 * consumer of `tokensForScheme(scheme)` for now; PR 5's `BJJDashboardPage`
 * will pass `useDashboardColorScheme()`'s return value as the `mode` arg.
 *
 * What's tested:
 *  - Light mode: palette.mode === 'light'; primary = tokens.light.accent;
 *    background / text / divider / success / warning / error all match
 *    the typed token bundle; shape.borderRadius = 12 (radius.md).
 *  - Dark mode:  palette.mode === 'dark';  primary = tokens.dark.accent;
 *    background.paper = tokens.dark.surface; text.primary = tokens.dark.fg.
 *  - Typography: fontFamily contains 'Roboto' (from base typography).
 *  - Shape parity: the two returned themes have the SAME palette key set
 *    (defensive against drift if a future PR adds a light-only field).
 *  - Identity: the two returned themes are NOT referentially equal
 *    (a consumer memoizing the theme sees a swap on mode change).
 *
 * Refs: REQ-BD11 (MUI mounting), REQ-BD12 (theme tokens from material-tokens),
 * design.md \u00a78 (MUI coexistence), \u00a79 (theme shim).
 */
import { describe, it, expect } from 'vitest'
import { createDashboardTheme } from '../../theme/mui-dashboard-theme'
import { MATERIAL_TOKENS, tokensForScheme } from '../../theme/material-tokens'

// ── Light mode ──────────────────────────────────────────────────

describe('createDashboardTheme("light") \u2014 light palette from tokens (REQ-BD12)', () => {
  const light = tokensForScheme('light')
  const theme = createDashboardTheme('light')

  it('palette.mode === "light"', () => {
    expect(theme.palette.mode).toBe('light')
  })

  it('palette.primary.main === tokens.light.accent', () => {
    expect(theme.palette.primary.main).toBe(light.color.accent)
    // Sanity: the token is the hex value (not the color-mix string).
    expect(theme.palette.primary.main).toBe('#1a73e8')
  })

  it('palette.background.default === tokens.light.bg (page bg)', () => {
    expect(theme.palette.background.default).toBe(light.color.bg)
    expect(theme.palette.background.default).toBe('#f8fafd')
  })

  it('palette.background.paper === tokens.light.surface (card surface)', () => {
    expect(theme.palette.background.paper).toBe(light.color.surface)
    expect(theme.palette.background.paper).toBe('#ffffff')
  })

  it('palette.text.primary / .secondary match tokens.light.fg / fg2', () => {
    expect(theme.palette.text.primary).toBe(light.color.fg)
    expect(theme.palette.text.primary).toBe('#202124')
    expect(theme.palette.text.secondary).toBe(light.color.fg2)
    expect(theme.palette.text.secondary).toBe('#3c4043')
  })

  it('palette.divider === tokens.light.border (so MUI Paper/Card dividers match CSS)', () => {
    expect(theme.palette.divider).toBe(light.color.border)
    expect(theme.palette.divider).toBe('#dadce0')
  })

  it('success / warning / error map to tokens.light.{success,warn,danger}', () => {
    expect(theme.palette.success.main).toBe(light.color.success)
    expect(theme.palette.warning.main).toBe(light.color.warn)
    expect(theme.palette.error.main).toBe(light.color.danger)
    expect(theme.palette.success.main).toBe('#188038')
    expect(theme.palette.warning.main).toBe('#f9ab00')
    expect(theme.palette.error.main).toBe('#d93025')
  })

  it('shape.borderRadius === 12 (matches --radius-md, used by .widget cards)', () => {
    expect(theme.shape.borderRadius).toBe(MATERIAL_TOKENS.radius.md)
    expect(theme.shape.borderRadius).toBe(12)
  })

  it('typography.fontFamily contains "Roboto" (body font, from baseTypography)', () => {
    expect(theme.typography.fontFamily).toContain('Roboto')
  })
})

// ── Dark mode ───────────────────────────────────────────────────

describe('createDashboardTheme("dark") \u2014 dark palette from tokens (REQ-BD12)', () => {
  const dark = tokensForScheme('dark')
  const theme = createDashboardTheme('dark')

  it('palette.mode === "dark"', () => {
    expect(theme.palette.mode).toBe('dark')
  })

  it('palette.primary.main === tokens.dark.accent (NOT the light value)', () => {
    expect(theme.palette.primary.main).toBe(dark.color.accent)
    expect(theme.palette.primary.main).toBe('#8ab4f8')
  })

  it('palette.background.paper === tokens.dark.surface (card surface, dark)', () => {
    expect(theme.palette.background.paper).toBe(dark.color.surface)
    expect(theme.palette.background.paper).toBe('#1a1d22')
  })

  it('palette.text.primary === tokens.dark.fg', () => {
    expect(theme.palette.text.primary).toBe(dark.color.fg)
    expect(theme.palette.text.primary).toBe('#e8eaed')
  })

  it('palette.error.main === tokens.dark.danger (lighter red on dark bg)', () => {
    expect(theme.palette.error.main).toBe(dark.color.danger)
    expect(theme.palette.error.main).toBe('#f28b82')
  })
})

// ── Cross-mode invariants ───────────────────────────────────────

describe('createDashboardTheme \u2014 cross-mode invariants', () => {
  const light = createDashboardTheme('light')
  const dark = createDashboardTheme('dark')

  it('returns two distinct objects (not referentially equal)', () => {
    expect(light).not.toBe(dark)
    expect(light.palette).not.toBe(dark.palette)
    expect(light.palette.primary).not.toBe(dark.palette.primary)
  })

  it('both themes expose the same top-level palette key set (shape parity)', () => {
    // Defensive: a future PR that adds a light-only field would drift here.
    expect(Object.keys(light.palette).sort()).toEqual(Object.keys(dark.palette).sort())
  })

  it('both themes share the same scheme-agnostic values (shape, typography, spacing, breakpoints)', () => {
    // The factory is scheme-agnostic for everything except palette + the
    // scheme-specific palette fields. A consumer that memoizes the theme
    // by mode can rely on these values being identical.
    expect(light.shape.borderRadius).toBe(dark.shape.borderRadius)
    expect(light.shape.borderRadius).toBe(MATERIAL_TOKENS.radius.md)
    expect(light.typography.fontFamily).toBe(dark.typography.fontFamily)
    expect(light.typography.fontFamily).toContain('Roboto')
    // `spacing(1)` and `breakpoints.values` are also derived from the
    // same scheme-agnostic tokens.
    expect(light.spacing(1)).toBe(dark.spacing(1))
    expect(light.breakpoints.values).toEqual(dark.breakpoints.values)
  })
})
