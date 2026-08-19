/**
 * Structural tests for the `material-tokens.ts` + `material-dashboard.css`
 * port of the Open Design artifact.
 *
 * Why a structural test: the CSS is a port of a static HTML file. There
 * is no runtime behavior to unit-test (CSS is consumed by the browser).
 * The only way to lock the contract is to assert that the file exists,
 * is non-empty, and contains the CSS class names the dashboard components
 * will reference. If a future PR edits the CSS and breaks a class name,
 * this test fails RED.
 *
 * Refs: PRD \u00a76.10.1 (CSS port path), design \u00a72 (file inventory),
 * template.html lines 7-328.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MATERIAL_TOKENS, tokensForScheme } from '../../theme/material-tokens'

// ── material-tokens.ts — typed TS mirror ───────────────────────

describe('MATERIAL_TOKENS — typed TS mirror of CSS variables', () => {
  it('exports a complete token tree for both color schemes', () => {
    expect(MATERIAL_TOKENS.color.light.bg).toBe('#f8fafd')
    expect(MATERIAL_TOKENS.color.dark.bg).toBe('#101418')
  })

  it('exposes category color tokens for all 7 BJJ categories', () => {
    const expected = ['takedown', 'guardPass', 'guard', 'submission', 'escape', 'transition', 'other']
    for (const key of expected) {
      expect(MATERIAL_TOKENS.category.light[key as keyof typeof MATERIAL_TOKENS.category.light]).toMatch(/^#/)
      expect(MATERIAL_TOKENS.category.dark[key as keyof typeof MATERIAL_TOKENS.category.dark]).toMatch(/^#/)
    }
  })

  it('exposes role + outcome color tokens for the roll widgets', () => {
    const keys = ['roleAttack', 'roleDefend', 'roleNeutral', 'outcomeSub', 'outcomeGain', 'outcomeLoss', 'outcomeNeutral'] as const
    for (const key of keys) {
      expect(MATERIAL_TOKENS.roleOutcome.light[key]).toMatch(/^#/)
      expect(MATERIAL_TOKENS.roleOutcome.dark[key]).toMatch(/^#/)
    }
  })

  it('exposes the typography scale in px', () => {
    expect(MATERIAL_TOKENS.typography.textXs).toBe(12)
    expect(MATERIAL_TOKENS.typography.textSm).toBe(14)
    expect(MATERIAL_TOKENS.typography.textBase).toBe(16)
    expect(MATERIAL_TOKENS.typography.textLg).toBe(18)
    expect(MATERIAL_TOKENS.typography.textXl).toBe(24)
    expect(MATERIAL_TOKENS.typography.text2xl).toBe(32)
    expect(MATERIAL_TOKENS.typography.text3xl).toBe(48)
    expect(MATERIAL_TOKENS.typography.text4xl).toBe(64)
  })

  it('exposes the spacing scale (--space-N) in px', () => {
    expect(MATERIAL_TOKENS.spacing[1]).toBe(4)
    expect(MATERIAL_TOKENS.spacing[2]).toBe(8)
    expect(MATERIAL_TOKENS.spacing[3]).toBe(12)
    expect(MATERIAL_TOKENS.spacing[4]).toBe(16)
    expect(MATERIAL_TOKENS.spacing[5]).toBe(20)
    expect(MATERIAL_TOKENS.spacing[6]).toBe(24)
    expect(MATERIAL_TOKENS.spacing[8]).toBe(32)
    expect(MATERIAL_TOKENS.spacing[12]).toBe(48)
  })

  it('exposes radii + motion tokens', () => {
    expect(MATERIAL_TOKENS.radius.sm).toBe(4)
    expect(MATERIAL_TOKENS.radius.md).toBe(12)
    expect(MATERIAL_TOKENS.radius.lg).toBe(24)
    expect(MATERIAL_TOKENS.radius.pill).toBe(9999)
    expect(MATERIAL_TOKENS.motion.fast).toBe(150)
    expect(MATERIAL_TOKENS.motion.base).toBe(250)
  })
})

describe('tokensForScheme — returns the right bundle for the mode', () => {
  it('returns the light bundle when scheme="light"', () => {
    const light = tokensForScheme('light')
    expect(light.color.bg).toBe('#f8fafd')
  })

  it('returns the dark bundle when scheme="dark"', () => {
    const dark = tokensForScheme('dark')
    expect(dark.color.bg).toBe('#101418')
  })
})

// ── material-dashboard.css — class-name coverage lock ───────────

// PR 4: theme files moved to shared src/theme/, re-exports left at old path
const CSS_PATH = resolve(__dirname, '../../../../../theme/material-dashboard.css')

const REQUIRED_CLASSES = [
  // AppShell
  '.appshell',
  '.sidenav',
  '.topbar',
  // Page
  '.page',
  '.page-head',
  '.eyebrow',
  // Filter
  '.segmented',
  '.refresh-btn',
  // Grid + widget
  '.grid',
  '.widget',
  '.widget-head',
  '.widget-title',
  '.widget-icon',
  // Hero + tech list (LastTechniques)
  '.hero-stat',
  '.tech-list',
  '.tech-row',
  '.tech-name',
  '.tech-count',
  '.chip',
  '.view-all',
  // Donut (TechniqueType)
  '.donut-wrap',
  '.donut',
  '.donut-track',
  '.legend',
  '.legend-row',
  '.insight',
  // Role (RoleBalance)
  '.role-stacked',
  '.role-legend',
  '.role-row',
  '.role-label',
  '.role-value',
  '.role-pct-bar',
  '.role-pct-fill',
  // Outcomes
  '.outcome-grid',
  '.outcome-tile',
  // Flow (RollFlow sequence timeline)
  '.flow-head',
  '.flow-steps',
  '.flow-step',
  '.flow-body',
  '.flow-lane',
  '.flow-chain',
  '.flow-circle',
  '.flow-summary',
  '.tag',
  // Footer
  '.foot',
] as const

describe('material-dashboard.css — class-name coverage (REQ-BD7)', () => {
  it('the file exists and is non-empty', () => {
    const contents = readFileSync(CSS_PATH, 'utf-8')
    expect(contents.length).toBeGreaterThan(1000)
  })

  it('contains every class name the dashboard components will reference', () => {
    const contents = readFileSync(CSS_PATH, 'utf-8')
    for (const cls of REQUIRED_CLASSES) {
      expect(contents, `expected CSS to contain "${cls}"`).toContain(cls)
    }
  })

  it('contains html.dark selectors for manual theme toggling', () => {
    const contents = readFileSync(CSS_PATH, 'utf-8')
    expect(contents).toMatch(/html\.dark\s+\.bjj-dashboard\s*\{[^}]*--bg:\s*#101418/)
  })

  it('contains the data-cat attribute selectors for category chips', () => {
    const contents = readFileSync(CSS_PATH, 'utf-8')
    const requiredCats = ['takedown', 'guard_pass', 'guard', 'submission', 'escape', 'transition', 'other']
    for (const cat of requiredCats) {
      expect(contents, `expected CSS to contain ".chip[data-cat=\\"${cat}\\"]"`).toContain(
        `.chip[data-cat="${cat}"]`,
      )
    }
  })
})

describe('dashboard style entry — wired into the page', () => {
  it('BJJDashboardPage imports load-dashboard-styles so widget classes resolve', () => {
    const pagePath = resolve(__dirname, '../../pages/BJJDashboardPage.tsx')
    const contents = readFileSync(pagePath, 'utf-8')
    expect(contents).toMatch(/load-dashboard-styles/)
  })
})

// Task 4.2 RED: CSS scoping per design D2 (REQ-BD9)
describe('material-dashboard.css — scoped tokens and element resets (Task 4.2, D2)', () => {
  const contents = readFileSync(CSS_PATH, 'utf-8')

  it('scopes :root tokens under .bjj-dashboard in light mode', () => {
    // Light mode tokens must be under .bjj-dashboard { ... }
    expect(contents).toMatch(/\.bjj-dashboard\s*\{[^}]*--bg:\s*#f8fafd/)
  })

  it('scopes :root tokens under .bjj-dashboard in dark mode', () => {
    expect(contents).toMatch(/html\.dark\s+\.bjj-dashboard\s*\{[^}]*--bg:\s*#101418/)
  })

  it('does NOT have bare :root token definitions (they must be scoped)', () => {
    // The file should NOT have ":root { --bg: ..." directly
    // (It should have ".bjj-dashboard { --bg: ..." instead)
    const rootTokenMatch = contents.match(/:root\s*\{[^}]*--bg:/)
    expect(rootTokenMatch).toBeNull()
  })

  it('scopes * reset under .bjj-dashboard (not bare "*")', () => {
    // Should have ".bjj-dashboard * { box-sizing: ..."
    // Should NOT have bare "* { box-sizing: ..." at top level
    expect(contents).toMatch(/\.bjj-dashboard\s+\*\s*\{[^}]*box-sizing:\s*border-box/)
    // Ensure there's no bare "* { box-sizing: ..." without .bjj-dashboard scope
    const bareReset = contents.match(/^[^.]*\*\s*\{[^}]*box-sizing/)
    expect(bareReset).toBeNull()
  })

  it('scopes html, body reset under .bjj-dashboard (not bare "html, body")', () => {
    // Should have ".bjj-dashboard html, .bjj-dashboard body { ..." or similar descendant scoping
    expect(contents).toMatch(/\.bjj-dashboard\s+(html|body)/)
  })
})

describe('material-dashboard.css — Roll flow sequence timeline (mat-bjj-app.html)', () => {
  const contents = readFileSync(CSS_PATH, 'utf-8')

  it('lays out lanes as 110px meta + 6-node chain', () => {
    expect(contents).toMatch(
      /\.flow-lane\s*\{[^}]*grid-template-columns:\s*110px\s+minmax\(0,\s*1fr\)/,
    )
    expect(contents).toMatch(
      /\.flow-chain\s*\{[^}]*grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)/,
    )
  })

  it('styles peak / end / loss circles and the connecting line', () => {
    expect(contents).toMatch(/\.flow-circle\.peak\s*\{/)
    expect(contents).toMatch(/\.flow-circle\.end\s*\{/)
    expect(contents).toMatch(/\.flow-chain::before\s*\{/)
  })
})
