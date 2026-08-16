/**
 * Typed mirror of the Material Design tokens used by the dashboard.
 *
 * Source of truth: `open-design/.../template.html` lines 12-85 (light)
 * and lines 88-122 (dark). The CSS lives in `material-dashboard.css`
 * (port of those lines); this file mirrors the same values as
 * TypeScript constants so MUI's `createTheme` (PR 4) can read hex
 * colors at theme-construction time (MUI does not read CSS variables
 * by default for `palette`).
 *
 * Why a typed export (not just CSS variables):
 *  - The donut, role-stacked bar, and flow bars need hex values at
 *    runtime for SVG `stroke` / inline `background`.
 *  - The category color tokens (`cat-submission`, `cat-takedown`, ...)
 *    are referenced by widget render functions (not just CSS).
 *  - Tests can assert the token map shape without parsing CSS.
 *
 * Refs: design \u00a72.5 (tokens), template.html :root and dark media query,
 * PRD \u00a76.10.2-6.10.4.
 */

export type ColorScheme = 'light' | 'dark'

/** Neutral / surface colors \u2014 keys mirror the CSS variable names. */
export interface NeutralTokens {
  bg: string
  surface: string
  surfaceWarm: string
  fg: string
  fg2: string
  muted: string
  meta: string
  border: string
  borderSoft: string
  accent: string
  accentOn: string
  accentHover: string
  accentActive: string
  success: string
  warn: string
  danger: string
}

/** Category colors (BJJ domain) \u2014 belt-agnostic, content-level tokens. */
export interface CategoryTokens {
  takedown: string
  guardPass: string
  guard: string
  submission: string
  escape: string
  transition: string
  other: string
}

/** Role + outcome accents for the roll widgets. */
export interface RoleOutcomeTokens {
  roleAttack: string
  roleDefend: string
  roleNeutral: string
  outcomeSub: string
  outcomeGain: string
  outcomeLoss: string
  outcomeNeutral: string
}

/** Typography tokens \u2014 sizes in px (matching CSS). */
export interface TypographyTokens {
  fontDisplay: string
  fontBody: string
  fontMono: string
  textXs: number
  textSm: number
  textBase: number
  textLg: number
  textXl: number
  text2xl: number
  text3xl: number
  text4xl: number
  leadingBody: number
  leadingTight: number
  trackingDisplay: number
}

/** Spacing scale (px) \u2014 matches `--space-N`. */
export interface SpacingTokens {
  1: number
  2: number
  3: number
  4: number
  5: number
  6: number
  8: number
  12: number
  sectionYDesktop: number
  sectionYTablet: number
  sectionYPhone: number
}

/** Radii (px) \u2014 matches `--radius-*`. */
export interface RadiusTokens {
  sm: number
  md: number
  lg: number
  pill: number
}

/** Elevation \u2014 matches `--elev-*` (CSS string for the box-shadow value). */
export interface ElevationTokens {
  flat: string
  ring: string
  raised: string
  focusRing: string
}

/** Motion tokens \u2014 matches `--motion-*` and `--ease-standard`. */
export interface MotionTokens {
  fast: number
  base: number
  easeStandard: string
}

export interface MaterialTokens {
  color: { light: NeutralTokens; dark: NeutralTokens }
  category: { light: CategoryTokens; dark: CategoryTokens }
  roleOutcome: { light: RoleOutcomeTokens; dark: RoleOutcomeTokens }
  typography: TypographyTokens
  spacing: SpacingTokens
  radius: RadiusTokens
  elevation: { light: ElevationTokens; dark: ElevationTokens }
  motion: MotionTokens
}

const baseTypography: TypographyTokens = {
  fontDisplay: '"Google Sans", Roboto, Arial, sans-serif',
  fontBody: 'Roboto, Arial, sans-serif',
  fontMono: '"Roboto Mono", ui-monospace, Menlo, monospace',
  textXs: 12,
  textSm: 14,
  textBase: 16,
  textLg: 18,
  textXl: 24,
  text2xl: 32,
  text3xl: 48,
  text4xl: 64,
  leadingBody: 1.5,
  leadingTight: 1.12,
  trackingDisplay: 0,
}

const baseSpacing: SpacingTokens = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  12: 48,
  sectionYDesktop: 96,
  sectionYTablet: 68,
  sectionYPhone: 48,
}

const baseRadius: RadiusTokens = {
  sm: 4,
  md: 12,
  lg: 24,
  pill: 9999,
}

const baseMotion: MotionTokens = {
  fast: 150,
  base: 250,
  easeStandard: 'cubic-bezier(0.2, 0, 0, 1)',
}

const lightNeutral: NeutralTokens = {
  bg: '#f8fafd',
  surface: '#ffffff',
  surfaceWarm: '#e8f0fe',
  fg: '#202124',
  fg2: '#3c4043',
  muted: '#5f6368',
  meta: '#1a73e8',
  border: '#dadce0',
  borderSoft: '#edf0f2',
  accent: '#1a73e8',
  accentOn: '#ffffff',
  accentHover: 'color-mix(in oklab, var(--accent), black 8%)',
  accentActive: 'color-mix(in oklab, var(--accent), black 14%)',
  success: '#188038',
  warn: '#f9ab00',
  danger: '#d93025',
}

const darkNeutral: NeutralTokens = {
  bg: '#101418',
  surface: '#1a1d22',
  surfaceWarm: '#1f2733',
  fg: '#e8eaed',
  fg2: '#bdc1c6',
  muted: '#9aa0a6',
  meta: '#8ab4f8',
  border: '#2d3137',
  borderSoft: '#23272d',
  accent: '#8ab4f8',
  accentOn: '#0b1a2c',
  accentHover: 'color-mix(in oklab, var(--accent), white 8%)',
  accentActive: 'color-mix(in oklab, var(--accent), white 16%)',
  success: '#81c995',
  warn: '#fdd663',
  danger: '#f28b82',
}

const lightCategory: CategoryTokens = {
  takedown: '#d97706',
  guardPass: '#1a73e8',
  guard: '#16a34a',
  submission: '#dc2626',
  escape: '#7c3aed',
  transition: '#0891b2',
  other: '#5f6368',
}

const darkCategory: CategoryTokens = {
  takedown: '#fbbf24',
  guardPass: '#8ab4f8',
  guard: '#6dd58c',
  submission: '#f28b82',
  escape: '#c4b0ff',
  transition: '#67c8e0',
  other: '#9aa0a6',
}

const lightRoleOutcome: RoleOutcomeTokens = {
  roleAttack: '#1a73e8',
  roleDefend: '#d97706',
  roleNeutral: '#5f6368',
  outcomeSub: '#188038',
  outcomeGain: '#1a73e8',
  outcomeLoss: '#d93025',
  outcomeNeutral: '#5f6368',
}

const darkRoleOutcome: RoleOutcomeTokens = {
  roleAttack: '#8ab4f8',
  roleDefend: '#fbbf24',
  roleNeutral: '#9aa0a6',
  outcomeSub: '#6dd58c',
  outcomeGain: '#8ab4f8',
  outcomeLoss: '#f28b82',
  outcomeNeutral: '#9aa0a6',
}

const lightElevation: ElevationTokens = {
  flat: 'none',
  ring: '0 0 0 1px var(--border)',
  raised: '0 3px 8px rgba(60, 64, 67, 0.18)',
  focusRing: '0 0 0 4px rgba(26, 115, 232, 0.24)',
}

const darkElevation: ElevationTokens = {
  flat: 'none',
  ring: '0 0 0 1px var(--border)',
  raised: '0 3px 8px rgba(0, 0, 0, 0.45)',
  focusRing: '0 0 0 4px rgba(138, 180, 248, 0.32)',
}

export const MATERIAL_TOKENS: MaterialTokens = {
  color: { light: lightNeutral, dark: darkNeutral },
  category: { light: lightCategory, dark: darkCategory },
  roleOutcome: { light: lightRoleOutcome, dark: darkRoleOutcome },
  typography: baseTypography,
  spacing: baseSpacing,
  radius: baseRadius,
  elevation: { light: lightElevation, dark: darkElevation },
  motion: baseMotion,
}

/**
 * Convenience helper: get the active token bundle for a color scheme.
 * PR 4's `createDashboardTheme(mode)` calls this with the return of
 * `useDashboardColorScheme()`.
 */
export function tokensForScheme(scheme: ColorScheme): {
  color: NeutralTokens
  category: CategoryTokens
  roleOutcome: RoleOutcomeTokens
  elevation: ElevationTokens
} {
  return {
    color: MATERIAL_TOKENS.color[scheme],
    category: MATERIAL_TOKENS.category[scheme],
    roleOutcome: MATERIAL_TOKENS.roleOutcome[scheme],
    elevation: MATERIAL_TOKENS.elevation[scheme],
  }
}
