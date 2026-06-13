/**
 * Bilingual category label map for BJJ technique categories.
 *
 * REQ-BD10: the dashboard renders English copy (NFR-07). The existing
 * `ProgressionSection.tsx` (blue-belt page) renders Spanish. This module
 * is the single source of truth: a typed `Record<locale, Record<category,
 * string>>` that both surfaces consume.
 *
 * Why a structured map (not two flat files):
 *   - The 7 categories are the same on both surfaces; keeping them in one
 *     place makes drift impossible.
 *   - When `theme-context-unified` (or any future i18n) lands, the helper
 *     becomes the i18n key path (`t('category-labels.submission')`).
 *
 * Adding a category: append to `BJJ_CATEGORIES` in `bjj.schema.ts` (the
 * Zod enum is the source of truth) and add a label here in BOTH locales
 * — TypeScript will fail at the helper signature if a locale is missing.
 */
import { BJJ_CATEGORIES, type BJJCategory } from './bjj.schema'

type Locale = 'en' | 'es'
type LabelsByLocale = Record<Locale, Record<BJJCategory, string>>

/**
 * Canonical bilingual category labels.
 *
 * English (dashboard, NFR-07) — Title Case plural per PRD \u00a76.4.
 * Spanish (blue-belt progression page) — short labels matching the
 *   pre-existing inline map that lived in `ProgressionSection.tsx`
 *   lines 171-177; this module supersedes that map.
 */
export const BJJ_CATEGORY_LABELS: LabelsByLocale = {
  en: {
    guard: 'Guard',
    takedown: 'Takedowns',
    submission: 'Submissions',
    escape: 'Escapes',
    transition: 'Transitions',
    guard_pass: 'Guard passes',
    other: 'Other',
  },
  es: {
    guard: 'Guardia',
    takedown: 'Comienzo de la lucha',
    submission: 'Sumisiones',
    escape: 'Escapes y salidas',
    transition: 'Transiciones',
    guard_pass: 'Pasados',
    other: 'Otros',
  },
}

/**
 * Resolve a category key to its display label in the requested locale.
 *
 * Unknown categories fall back to the 'other' label rather than throwing \u2014
 * the helper is called on user-editable data (bjj_techniques.category
 * accepts any BJJCategory, but future migrations or manual SQL fixes
 * could land an unknown value). The fallback is observable in tests via
 * `categoryLabel('non_existent', 'en') === 'Other'`.
 *
 * Type safety: the parameter is typed `BJJCategory` so TS catches unknown
 * values at the call site. The `as never` escape hatch in tests is the
 * only way to exercise the fallback path with a literal unknown key.
 */
export function categoryLabel(category: BJJCategory, locale: Locale): string {
  const labels = BJJ_CATEGORY_LABELS[locale] as Record<string, string> | undefined
  if (labels && category in labels) {
    return labels[category]
  }
  return BJJ_CATEGORY_LABELS[locale].other
}

/** Re-export so consumers don't need a second import line. */
export { BJJ_CATEGORIES }
export type { BJJCategory, Locale }
