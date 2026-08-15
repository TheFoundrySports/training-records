/**
 * `TechniqueTypeWidget` — the second of 5 dashboard widgets
 * (REQ-BD4 row 1, span-3).
 *
 * Renders the technique-type distribution as a custom SVG donut chart
 * (no chart library) with a centered total-rolls label, a clickable
 * legend on the right, and an insight callout below.
 *
 * Donut math (per design.md §6.4 + template.html lines 460–500):
 *  - `viewBox="0 0 100 100"`, `cx=50`, `cy=50`, `r=50`
 *  - Circumference `C = 2πr ≈ 314.159`
 *  - For each segment `i`:
 *      `arcLength_i   = (pct_i / 100) * C`
 *      `offset_i      = -(cumulativePctBefore_i / 100) * C`
 *      `strokeDasharray = "${arcLength_i} ${C}"`
 *      `strokeDashoffset = "${offset_i}"`
 *  - The SVG wrapper has `transform: rotate(-90deg)` (CSS line 241), so
 *    segment 0 starts at 12 o'clock.
 *
 * Drill-down (REQ-BD6): clicking a legend row calls
 *   `useNavigate('/bjj/blue-belt-progression?category={key}')`.
 * The legend row is a `<button>` (not `<a>`) for two reasons:
 *  1. Consistent with the other dashboard drill-downs
 *     (`LastTechniquesWidget` rows are `<button>` for the same reason).
 * 2. The button keeps the existing `:focus-visible` ring from
 *     `material-dashboard.css:124`; `<Link>` would change the visual
 *     focus indicator.
 *
 * Color tokens:
 *  - Each segment + swatch uses `var(--cat-<category>)` — no new tokens
 *    are introduced (design.md §6 hard rule).
 *  - The CSS variables live in `material-dashboard.css:64-70` (light)
 *    and `:99-105` (dark).
 *
 * Category labels come from `categoryLabel(category, 'en')` (PR 3) per
 * REQ-PV5 (English display labels, NFR-07).
 *
 * Empty state:
 *  - When `data.segments` is empty, the donut renders no segment circles
 *    and the center label reads `0`. The parent `BJJDashboardPage` wraps
 *    the widget in `DashboardWidgetShell` which renders the empty copy
 *    when `totalRolls === 0` too.
 *
 * Refs: T6a.1, REQ-BD6 (drill-down), REQ-PV5 (English labels),
 * NFR-07 (English copy).
 */
import { useNavigate } from 'react-router'
import { categoryLabel } from '../../category-labels'
import { WIDGET_COPY } from '../copy/dashboard-copy'
import { InsightIcon } from './InsightIcon'
import type { BJJCategory } from '../../bjj.schema'
import type { TechniqueTypesData } from '../types/dashboard.types'

export interface TechniqueTypeWidgetProps {
  /** Donut segments + insight rows from the dashboard RPC. */
  data: TechniqueTypesData
}

/** Circumference of the donut at r=50 (in the viewBox coordinate system). */
const DONUT_CIRCUMFERENCE = 2 * Math.PI * 50

/** SVG stroke width (in viewBox units). Task 4.3: updated from 20 to 18 per D3. */
const DONUT_STROKE_WIDTH = 18

/**
 * Compute the `stroke-dasharray` + `stroke-dashoffset` for each segment.
 *
 * The first segment has offset 0 (it starts at 12 o'clock after the
 * -90deg CSS rotation); each subsequent segment has a negative offset
 * equal to the cumulative arc length of the segments before it.
 */
function computeDonutSegments(
  segments: TechniqueTypesData['segments'],
): Array<{ dasharray: string; offset: number }> {
  let cumulativePct = 0
  return segments.map((segment) => {
    const arcLength = (segment.pct / 100) * DONUT_CIRCUMFERENCE
    const offsetPx = -((cumulativePct / 100) * DONUT_CIRCUMFERENCE)
    cumulativePct += segment.pct
    return {
      dasharray: `${arcLength} ${DONUT_CIRCUMFERENCE}`,
      offset: offsetPx,
    }
  })
}

function InsightRow({ text }: { text: string }) {
  return (
    <div className="insight" role="note">
      <InsightIcon />
      <span>{text}</span>
    </div>
  )
}

export function TechniqueTypeWidget({ data }: TechniqueTypeWidgetProps) {
  const navigate = useNavigate()
  const segments = data?.segments ?? []
  const insights = data?.insights ?? []
  const practiceTotal = data?.total ?? segments.reduce((sum, segment) => sum + segment.count, 0)
  const segmentLayout = computeDonutSegments(segments)

  const handleLegendClick = (category: BJJCategory) => {
    void navigate(`/bjj/blue-belt-progression?category=${category}`)
  }

  return (
    <>
      <div className="donut-wrap">
        <div className="donut" data-testid="donut" aria-label="Technique type distribution donut chart">
          <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
            {/* Track (the unfilled portion of the ring) */}
            <circle
              className="donut-track"
              cx={60}
              cy={60}
              r={50}
              fill="none"
              strokeWidth={DONUT_STROKE_WIDTH}
            />
            {/* One <circle> per segment, each with its own dasharray + offset */}
            {segments.map((segment, idx) => (
              <circle
                key={segment.category}
                cx={60}
                cy={60}
                r={50}
                fill="none"
                stroke={`var(--cat-${segment.category})`}
                strokeWidth={DONUT_STROKE_WIDTH}
                strokeDasharray={segmentLayout[idx]?.dasharray ?? '0 0'}
                strokeDashoffset={segmentLayout[idx]?.offset ?? 0}
                strokeLinecap="butt"
              />
            ))}
          </svg>
          <div className="center">
            <div>
              <div className="n num">{practiceTotal}</div>
              <div className="l">{WIDGET_COPY.techniqueTypes.donutLabel}</div>
            </div>
          </div>
        </div>

        <ul className="legend">
          {segments.map((segment) => (
            <li key={segment.category}>
              <button
                type="button"
                className="legend-row"
                onClick={() => handleLegendClick(segment.category)}
                aria-label={`${categoryLabel(segment.category, 'en')}, ${segment.pct}%`}
              >
                <span
                  className="swatch"
                  aria-hidden="true"
                  style={{ background: `var(--cat-${segment.category})` }}
                />
                <span className="name">{categoryLabel(segment.category, 'en')}</span>
                <span className="pct">{segment.pct}%</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {insights.length > 0 ? (
        <div>
          {insights.map((insight, idx) => (
            <InsightRow key={`${insight.text}-${idx}`} text={insight.text} />
          ))}
        </div>
      ) : null}
    </>
  )
}
