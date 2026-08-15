/**
 * RED tests for `categoryLabel` and `BJJ_CATEGORY_LABELS`.
 *
 * REQ-PV3-adjacent: a typed bilingual category label map. The dashboard uses
 * English labels (NFR-07); the existing `ProgressionSection.tsx` uses Spanish
 * inline (lines 171-177). This module is the single source of truth.
 *
 * Failure mode: any of these assertions failing means the helper is missing
 * the locale, the category, or the bilingual guarantee.
 *
 * Refs: REQ-BD10 (English dashboard copy), explore §1.4 (Spanish page must
 * keep working).
 */
import { describe, it, expect } from 'vitest'
import { BJJ_CATEGORIES } from '../bjj.schema'
import { BJJ_CATEGORY_LABELS, categoryLabel } from '../category-labels'

// ── Structure: the map must cover every BJJ_CATEGORIES value for both locales ──

describe('BJJ_CATEGORY_LABELS — bilingual coverage (REQ-BD10)', () => {
  it('exports a label for every BJJ_CATEGORIES key in English', () => {
    for (const key of BJJ_CATEGORIES) {
      const label = BJJ_CATEGORY_LABELS.en[key]
      expect(label, `expected BJJ_CATEGORY_LABELS.en["${key}"]`).toBeTruthy()
      expect(typeof label).toBe('string')
      expect(label.length).toBeGreaterThan(0)
    }
  })

  it('exports a label for every BJJ_CATEGORIES key in Spanish', () => {
    for (const key of BJJ_CATEGORIES) {
      const label = BJJ_CATEGORY_LABELS.es[key]
      expect(label, `expected BJJ_CATEGORY_LABELS.es["${key}"]`).toBeTruthy()
      expect(typeof label).toBe('string')
      expect(label.length).toBeGreaterThan(0)
    }
  })

  it('exposes exactly two locales: en and es', () => {
    expect(Object.keys(BJJ_CATEGORY_LABELS).sort()).toEqual(['en', 'es'])
  })

  it('English category labels follow the canonical casing (Title Case plural)', () => {
    // Dashboard render is English-only (NFR-07). The English labels in the
    // PRD §6.4 are Title Case plural ("Submissions", "Takedowns"). The
    // helper does NOT translate — it just returns what's in the map — so the
    // assertion is on the map content, not the function.
    expect(BJJ_CATEGORY_LABELS.en.submission).toBe('Submissions')
    expect(BJJ_CATEGORY_LABELS.en.guard).toBe('Guard')
    expect(BJJ_CATEGORY_LABELS.en.guard_pass).toBe('Guard passes')
    expect(BJJ_CATEGORY_LABELS.en.takedown).toBe('Takedowns')
    expect(BJJ_CATEGORY_LABELS.en.escape).toBe('Escapes')
    expect(BJJ_CATEGORY_LABELS.en.transition).toBe('Transitions')
    expect(BJJ_CATEGORY_LABELS.en.other).toBe('Other')
  })
})

// ── Helper: categoryLabel(category, locale) — locale discriminated ────────

describe('categoryLabel(category, locale) — locale-discriminated helper', () => {
  it('returns the English label for the given category', () => {
    expect(categoryLabel('submission', 'en')).toBe('Submissions')
    expect(categoryLabel('guard', 'en')).toBe('Guard')
    expect(categoryLabel('takedown', 'en')).toBe('Takedowns')
  })

  it('returns the Spanish label for the given category', () => {
    expect(categoryLabel('submission', 'es')).toBe('Sumisiones')
    expect(categoryLabel('guard', 'es')).toBe('Guardia')
    expect(categoryLabel('takedown', 'es')).toBe('Comienzo de la lucha')
  })

  it('returns the "other" fallback for unknown categories in both locales', () => {
    // We pass `as never` to simulate an unknown key without TS yelling at us.
    // The map should default to the 'other' label rather than crashing.
    expect(categoryLabel('non_existent_category' as never, 'en')).toBe('Other')
    expect(categoryLabel('non_existent_category' as never, 'es')).toBe('Otros')
  })
})
