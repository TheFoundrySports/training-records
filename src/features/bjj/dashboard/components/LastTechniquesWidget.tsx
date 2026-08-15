/**
 * `LastTechniquesWidget` — the first of 5 dashboard widgets (REQ-BD4 row 1, span-3).
 *
 * Displays the user's most-recently-practiced techniques with a hero
 * stat of total practice count and a drill-down to
 * `TechniquePracticeModal` on row click (REQ-BD6).
 *
 * Layout contract (template.html #w-last-techniques):
 *  - Hero stat: `<CountUp>` + "total practices" label (`.hero-stat`).
 *  - List: `.tech-list` with `.tech-row` items — name + meta line
 *    (category chip · relative time) | ×count | chevron.
 *
 * Refs: T5.12, T5.13, REQ-BD6 (drill-down), REQ-PV5 (chip categories).
 */
import { useState } from 'react'
import { Link } from 'react-router'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { CountUp } from '@/components/react-bits/CountUp'
import { categoryLabel } from '../../category-labels'
import { relativeTimeEn } from '../utils/relativeTime'
import { LAST_TECHNIQUES_VIEW_ALL, WIDGET_COPY } from '../copy/dashboard-copy'
import { TechniquePracticeModal } from '@/features/bjj/progression/components/TechniquePracticeModal'
import type { LastTechniquesData } from '../types/dashboard.types'

export interface LastTechniquesWidgetProps {
  data: LastTechniquesData
  /** Distinct techniques practiced in the window (hero stat). */
  distinctCount: number
}

export function LastTechniquesWidget({ data, distinctCount }: LastTechniquesWidgetProps) {
  const rows = data?.rows ?? []
  const total = distinctCount > 0 ? distinctCount : rows.length

  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null)

  return (
    <>
      <div className="hero-stat">
        <span className="num">
          <CountUp value={total} />
        </span>
        <span className="label">{WIDGET_COPY.lastTechniques.heroLabel}</span>
      </div>

      {rows.length === 0 ? null : (
        <div className="tech-list">
          {rows.map((row) => (
            <button
              key={row.technique_id || row.technique_name}
              type="button"
              className="tech-row"
              onClick={() =>
                setSelected({ id: row.technique_id, name: row.technique_name })
              }
              aria-label={`${row.technique_name}, last practiced ${relativeTimeEn(new Date(row.last_practiced_at))}, ${row.practice_count} practices`}
            >
              <div>
                <div className="tech-name">{row.technique_name}</div>
                <div className="tech-meta">
                  <span className="chip" data-cat={row.category}>
                    <span className="dot" aria-hidden="true" />
                    {categoryLabel(row.category, 'en')}
                  </span>
                  {' · '}
                  {relativeTimeEn(new Date(row.last_practiced_at))}
                </div>
              </div>
              <div className="tech-count num">×{row.practice_count}</div>
              <ChevronRightIcon
                aria-hidden="true"
                sx={{ width: 18, height: 18, color: 'var(--muted)' }}
              />
            </button>
          ))}
        </div>
      )}

      {rows.length > 0 ? (
        <Link className="view-all" to="/bjj/blue-belt-progression">
          {LAST_TECHNIQUES_VIEW_ALL}
        </Link>
      ) : null}

      {selected ? (
        <TechniquePracticeModal
          techniqueId={selected.id}
          techniqueName={selected.name}
          open
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  )
}
