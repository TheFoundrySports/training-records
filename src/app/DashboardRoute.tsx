/**
 * `BJJDashboardRoute` \u2014 the router-side wrapper for the BJJ dashboard.
 *
 * Lives in its own file (not co-located in `router.tsx`) because the
 * router module exports a non-component `router` const, and Vite's
 * react-refresh plugin requires component-only files for Fast Refresh.
 *
 * Responsibilities:
 *  - Lazy-import `BJJDashboardPage` so MUI v6 + emotion don't bloat the
 *    initial bundle (REQ-BD1, NFR-05).
 *  - Wrap the page in `<Suspense>` with a CSS-only skeleton fallback so
 *    the chunk-load transition is seamless.
 *
 * The fallback uses the same `.page`, `.grid`, `.widget`, `.span-N`
 * classes the page renders, but skips MUI imports so it doesn't pull
 * MUI into the initial chunk (which would defeat the purpose of the
 * lazy import).
 */
import { lazy, Suspense } from 'react'

const BJJDashboardPage = lazy(() =>
  import('@/features/bjj/dashboard/pages/BJJDashboardPage').then((m) => ({
    default: m.BJJDashboardPage,
  })),
)

function DashboardFallback() {
  return (
    <div className="page" role="status" aria-busy="true" aria-label="Loading dashboard">
      <div className="page-head">
        <div>
          <p className="eyebrow">
            <span className="dot" aria-hidden="true" />
            Loading\u2026
          </p>
          <h1>BJJ Evolution Dashboard</h1>
        </div>
      </div>
      <div className="grid">
        <div className="widget span-3" style={{ minHeight: 220 }} aria-hidden="true" />
        <div className="widget span-3" style={{ minHeight: 220 }} aria-hidden="true" />
        <div className="widget span-2" style={{ minHeight: 220 }} aria-hidden="true" />
        <div className="widget span-4" style={{ minHeight: 220 }} aria-hidden="true" />
        <div className="widget span-6" style={{ minHeight: 220 }} aria-hidden="true" />
      </div>
    </div>
  )
}

export function BJJDashboardRoute() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <BJJDashboardPage />
    </Suspense>
  )
}