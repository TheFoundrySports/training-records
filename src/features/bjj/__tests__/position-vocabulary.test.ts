/**
 * RED tests for `getPositionLabel` \u2014 position vocabulary helper.
 *
 * REQ-PV3: the helper resolves a `BJJPositionKey` to its display label in
 * the requested locale, with **dev-throw / prod-warn** semantics for
 * unknown keys. The 11+ canonical keys come from the `bjj_positions`
 * seed migration; the helper MUST stay in sync with it.
 *
 * Design callout: in dev/test we throw on unknown keys so a typo in the
 * LLM prompt or the form select fails loudly. In production we return
 * the `other` label and `console.warn` so the UI never breaks on
 * corrupted data.
 *
 * Refs: REQ-PV3 (helper), REQ-PV5 (RollFlowWidget display labels),
 * design \u00a77 (PV lookup).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BJJ_POSITION_KEYS } from '../bjj.schema'

// Vitest env defaults: NODE_ENV is 'test' (so prod-only branches are
// skipped). We swap import.meta.env.DEV for each describe block.

describe('getPositionLabel \u2014 dev/test: throws on unknown key (REQ-PV3)', () => {
  beforeEach(() => {
    vi.stubEnv('DEV', true)
    vi.stubEnv('PROD', false)
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns display_en for a canonical key in English', async () => {
    const { getPositionLabel } = await import('../position-vocabulary')
    expect(getPositionLabel('mount', 'en')).toBe('Mount')
    expect(getPositionLabel('closed_guard', 'en')).toBe('Closed guard')
    expect(getPositionLabel('knee_on_belly', 'en')).toBe('Knee on belly')
    expect(getPositionLabel('back_control', 'en')).toBe('Back control')
  })

  it('returns display_es for a canonical key in Spanish', async () => {
    const { getPositionLabel } = await import('../position-vocabulary')
    expect(getPositionLabel('mount', 'es')).toBe('Montada')
    expect(getPositionLabel('closed_guard', 'es')).toBe('Guardia cerrada')
    expect(getPositionLabel('knee_on_belly', 'es')).toBe('Rodilla en el est\u00f3mago')
  })

  it('throws on an unknown key in dev (loud failure for typos)', async () => {
    const { getPositionLabel } = await import('../position-vocabulary')
    expect(() =>
      getPositionLabel('knee_on_belly_pizza' as never, 'en'),
    ).toThrow(/unknown position key/i)
  })
})

describe('getPositionLabel \u2014 production: warn + "other" fallback (REQ-PV3)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('PROD', true)
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    warnSpy.mockRestore()
  })

  it('returns the "other" label for an unknown key in English and warns', async () => {
    const { getPositionLabel } = await import('../position-vocabulary')
    expect(getPositionLabel('knee_on_belly_pizza' as never, 'en')).toBe('Other')
    expect(warnSpy).toHaveBeenCalled()
    const callArg = String(warnSpy.mock.calls[0]?.[0] ?? '')
    expect(callArg).toMatch(/knee_on_belly_pizza/)
  })

  it('returns the "other" label for an unknown key in Spanish and warns', async () => {
    const { getPositionLabel } = await import('../position-vocabulary')
    expect(getPositionLabel('standing_pizza' as never, 'es')).toBe('Otro')
    expect(warnSpy).toHaveBeenCalled()
  })

  it('canonical keys still return the right label in production (no warn)', async () => {
    const { getPositionLabel } = await import('../position-vocabulary')
    expect(getPositionLabel('mount', 'en')).toBe('Mount')
    expect(warnSpy).not.toHaveBeenCalled()
  })
})

describe('BJJ_POSITION_KEYS re-export (REQ-PV3)', () => {
  it('re-exports the same array the schema exports (single source of truth)', async () => {
    const { BJJ_POSITION_KEYS: reExported } = await import('../position-vocabulary')
    // Reference equality \u2014 the re-export must point at the exact array
    // from bjj.schema.ts, not a copy.
    expect(reExported).toBe(BJJ_POSITION_KEYS)
  })
})
