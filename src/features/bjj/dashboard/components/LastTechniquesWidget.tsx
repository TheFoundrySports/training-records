/**
 * `LastTechniquesWidget` \u2014 the first of 5 dashboard widgets (REQ-BD4 row 1, span-3).
 *
 * Displays the user's most-recently-practiced techniques with a hero
 * stat of total practice count and a drill-down to
 * `TechniquePracticeModal` on row click (REQ-BD6).
 *
 * Layout contract:
 *  - Hero stat: `<CountUp>` animating the sum of `practice_count` across
 *    all rows.
 *  - List: `.tech-list` container with `.tech-row` items (CSS in
 *    `material-dashboard.css` lines 218-223).
 *  - Each row: technique name + category chip + relative-time + count.
 *
 * Why we use `TechniquePracticeModal` directly (not a generic DrillDown):
 *  - The modal already owns the technique-history fetch and the dialog
 *    UX (REQ-BD6). Wrapping it would only duplicate its props.
 *  - The widget passes `open={selectedId !== null}` + `onClose={() =>
 *    setSelectedId(null)}`; the modal handles the rest.
 *
 * Empty state:
 *  - When `data.rows` is empty, the parent (`BJJDashboardPage`) wraps
 *    the widget in `DashboardWidgetShell` which renders the empty slot.
 *    This component still renders the hero stat as 0 so the widget
 *    shape stays consistent when shown without the shell wrapper.
 *
 * Refs: T5.12, T5.13, REQ-BD6 (drill-down), REQ-PV5 (chip categories).
 */
import { useState } from 'react'
import { Stack } from '@mui/material'
import { CountUp } from '@/components/react-bits/CountUp'
import { relativeTimeEn } from '../utils/relativeTime'
import { TechniquePracticeModal } from '@/features/bjj/progression/components/TechniquePracticeModal'
import type { LastTechniquesData, LastTechniqueRow } from '../types/dashboard.types'

export interface LastTechniquesWidgetProps {
  data: LastTechniquesData
}

function totalPracticeCount(rows: LastTechniqueRow[]): number {
  return rows.reduce((sum, row) => sum + row.practice_count, 0)
}

export function LastTechniquesWidget({ data }: LastTechniquesWidgetProps) {
  const rows = data.rows
  const total = totalPracticeCount(rows)

  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null)

  return (
    <>
      <div className="hero-stat">
        <span className="num">
          <CountUp value={total} />
        </span>
        <span className="label">total practices</span>
      </div>

      {rows.length === 0 ? null : (
        <ul className="tech-list">
          {rows.map((row) => (
            <li key={row.technique_id}>
              <button
                type="button"
                className="tech-row"
                onClick={() =>
                  setSelected({ id: row.technique_id, name: row.technique_name })
                }
                aria-label={`${row.technique_name}, last practiced ${relativeTimeEn(new Date(row.last_practiced_at))}, ${row.practice_count} practices`}
              >
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                <span className="tech-name">{row.technique_name}</span>
                <span className="chip" data-cat={row.category}>
                  <span className="dot" aria-hidden="true" />
                  {row.category}
                </span>
              </Stack>
              <span className="tech-meta">
                {relativeTimeEn(new Date(row.last_practiced_at))}
              </span>
              <span className="tech-count">{row.practice_count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

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