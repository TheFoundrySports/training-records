/**
 * `DashboardSkeleton` \u2014 the loading placeholder rendered while
 * `useBJJDashboard` is pending (REQ-BD5: "Skeletons appear during loading").
 *
 * Layout mirrors the real grid exactly: 5 widgets, desktop spans 3/3/2/4/6
 * per REQ-BD4. The grid auto-collapses to 4 cols (1280px) and 1 col
 * (768px) via the CSS rules in material-dashboard.css lines 189-206 \u2014
 * the same rules that drive the real grid.
 *
 * Uses MUI `<Skeleton>` for the inner blocks (theme-aware, respects
 * prefers-reduced-motion automatically per the @mui/material contract).
 * The `.widget` + `.span-N` classes on the outer card match the real
 * widget markup so the grid columns align identically.
 *
 * The outer container has `role="status" aria-busy="true"` so AT users
 * hear "loading" and screen readers don't read out skeleton subtrees.
 *
 * Refs: T5.10, REQ-BD4 (desktop spans), REQ-BD5 (skeletons during loading).
 */
import { Skeleton, Stack } from '@mui/material'
import type { WidgetSpan } from '../types/dashboard.types'

interface SkeletonCardProps {
  span: WidgetSpan
  /** Number of inner skeleton rows to render (varies by widget type). */
  rows?: number
}

function SkeletonCard({ span, rows = 3 }: SkeletonCardProps) {
  return (
    <div className={`widget span-${span}`} aria-hidden="true">
      <Skeleton variant="text" width="40%" height={28} />
      <Skeleton variant="text" width="70%" height={20} />
      <Stack spacing={1} sx={{ mt: 2 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={36} />
        ))}
      </Stack>
    </div>
  )
}

/** The 5-widget desktop span order per REQ-BD4. */
const DESKTOP_SPANS: WidgetSpan[] = [3, 3, 2, 4, 6]

export function DashboardSkeleton() {
  return (
    <div className="grid" role="status" aria-busy="true" aria-label="Loading dashboard">
      {DESKTOP_SPANS.map((span, idx) => (
        <SkeletonCard key={idx} span={span} rows={span === 6 ? 7 : span === 2 ? 2 : 3} />
      ))}
    </div>
  )
}