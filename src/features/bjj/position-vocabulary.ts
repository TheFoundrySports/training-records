/**
 * Position vocabulary helper \u2014 shared client-side source for BJJ position
 * display labels. Backs REQ-PV3, REQ-PV5, and the AI prompt grounding in
 * REQ-PV7.
 *
 * The 11 canonical keys come from the `bjj_positions` lookup table seed
 * (migration `20260612000002_bjj_positions.sql`). This helper is the
 * TypeScript mirror \u2014 it MUST stay in sync with the seed (the schema's
 * `BJJPositionKeySchema` enforces the same set at the parse boundary).
 *
 * **Why dev-throw / prod-warn**:
 *  - In dev/test, an unknown key is a programmer error (typo in a form
 *    select, AI prompt drift, RPC payload regression). Throwing makes it
 *    impossible to ship a broken UI silently.
 *  - In production, the data may be corrupted (manual SQL fix, race with
 *    a rollback, etc.). The UI must keep rendering \u2014 we fall back to
 *    `other` and warn so on-call can spot the pattern in logs.
 *
 * Refs: REQ-PV3 (helper), REQ-PV5 (widget display), REQ-PV7 (canonical keys).
 */
import {
  BJJ_POSITION_KEYS,
  BJJPositionKeySchema,
  type BJJPositionKey,
} from './bjj.schema'

type Locale = 'en' | 'es'

/** Bilingual display labels for the 11 canonical position keys. */
const LABELS: Record<BJJPositionKey, Record<Locale, string>> = {
  standing: { en: 'Standing', es: 'De pie' },
  closed_guard: { en: 'Closed guard', es: 'Guardia cerrada' },
  open_guard: { en: 'Open guard', es: 'Guardia abierta' },
  half_guard: { en: 'Half guard', es: 'Media guardia' },
  side_control: { en: 'Side control', es: 'Control lateral' },
  mount: { en: 'Mount', es: 'Montada' },
  back_control: { en: 'Back control', es: 'Control de espalda' },
  turtle: { en: 'Turtle', es: 'Tortuga' },
  knee_on_belly: { en: 'Knee on belly', es: 'Rodilla en el est\u00f3mago' },
  leg_entanglement: { en: 'Leg entanglement', es: 'Enredo de piernas' },
  other: { en: 'Other', es: 'Otro' },
}

/**
 * Resolve a `BJJPositionKey` to its display label in the requested locale.
 *
 * Branch on `import.meta.env.DEV`:
 *  - DEV (test included): throws on unknown keys.
 *  - PROD: returns the `other` label + `console.warn` so the UI stays
 *    usable. The warning includes the unknown key for grep-ability.
 */
export function getPositionLabel(key: BJJPositionKey, locale: Locale): string {
  // First-pass: trust the typed key. If the TS contract is honored, the
  // lookup is just a hash hit.
  if (key in LABELS) {
    return LABELS[key][locale]
  }

  // Defensive: catch the case where a JS caller passed an untyped string
  // (e.g. AI prompt text bleeding through). The Zod schema is the
  // boundary guard, but this helper is also imported by display code
  // that may not have parsed.
  if (BJJPositionKeySchema.safeParse(key).success) {
    // Should be unreachable \u2014 if the Zod schema accepts it, the lookup
    // table covers it. If it doesn't, the schema rejects and we fall through.
    return LABELS.other[locale]
  }

  if (import.meta.env.DEV) {
    throw new Error(
      `[position-vocabulary] unknown position key: "${String(key)}". ` +
        `Add it to bjj_positions seed and to the LABELS map.`,
    )
  }

  // Production: warn + fallback. We still log the unknown key so
  // dashboards can spot drift.
  // eslint-disable-next-line no-console
  console.warn(
    `[position-vocabulary] unknown position key "${String(key)}" \u2014 ` +
      `falling back to "other" (${locale})`,
  )
  return LABELS.other[locale]
}

/**
 * Re-export the canonical-key array so consumers can import it from
 * either module. The re-export is the **exact same array reference**
 * \u2014 tests assert reference equality to lock the contract (so any
 * accidental copy would break).
 */
export { BJJ_POSITION_KEYS }
export type { BJJPositionKey, Locale }
