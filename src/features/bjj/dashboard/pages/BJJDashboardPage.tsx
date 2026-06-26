/**
 * `BJJDashboardPage` \u2014 the BJJ Evolution Dashboard route component.
 *
 * Composes the 5-widget grid, page header, time filter, and footer.
 * The page is the ONLY place MUI's `ThemeProvider` mounts in the app
 * (REQ-BD7: MUI scoping).
 *
 * Responsibilities:
 *  1. Mount `<ThemeProvider theme={createDashboardTheme(mode)}>` so
 *     MUI components in the dashboard subtree get the right palette.
 *     The follow-up `theme-context-unified` change replaces
 *     `useDashboardColorScheme`'s body; this file stays unchanged.
 *  2. Manage the active window preset (lifted state so the filter and
 *     the data hook agree).
 *  3. Fetch the dashboard data via `useBJJDashboard(window)`.
 *  4. Compose the header + filter + 5-widget grid + footer.
 *  5. Show the DashboardSkeleton while loading; show per-widget
 *     error/empty states via `DashboardWidgetShell`.
 *
 * The 4 widgets that aren't yet implemented (TechniqueTypeWidget,
 * RoleBalanceWidget, OutcomesWidget, RollFlowWidget) are rendered as
 * `DashboardWidgetShell` instances with a placeholder heading + empty
 * copy. PR 6a and PR 6b swap the children for the real widgets.
 *
 * Refs: T5.14, REQ-BD1 (route), REQ-BD3 (data shape), REQ-BD4 (grid),
 * REQ-BD5 (loading/empty/error), REQ-BD7 (MUI scoping), REQ-BD9
 * (React Bits via LastTechniquesWidget's CountUp hero).
 */
import { useCallback, useMemo, useState } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { createDashboardTheme } from '../theme/mui-dashboard-theme'
import { useDashboardColorScheme } from '../theme/useDashboardColorScheme'
import { useBJJDashboard } from '../hooks/useBJJDashboard'
import { bjjDashboardKeys } from '../hooks/bjjDashboardKeys'
import { DashboardPageHeader } from '../components/DashboardPageHeader'
import { DashboardTimeFilter } from '../components/DashboardTimeFilter'
import { DashboardSkeleton } from '../components/DashboardSkeleton'
import { DashboardFooter } from '../components/DashboardFooter'
import { DashboardWidgetShell } from '../components/DashboardWidgetShell'
import { LastTechniquesWidget } from '../components/LastTechniquesWidget'
import { TechniqueTypeWidget } from '../components/TechniqueTypeWidget'
import { DEFAULT_DASHBOARD_WINDOW } from '../components/DashboardTimeFilter.constants'
import type { DashboardWindow } from '../types/dashboard.types'
import type { QueryClient } from '@tanstack/react-query'

// useQueryClient is imported lazily inside the component to avoid pulling
// @tanstack/react-query into the public types if the file is mocked in
// tests.
import { useQueryClient } from '@tanstack/react-query'
import type { LastTechniquesData, BJJDashboardData } from '../types/dashboard.types'

interface StubWidgetCopy {
  title: string
  sub: string
}

/**
 * Stubs for the 3 widgets that haven't shipped yet. The PR 6a scope
 * replaces the "Technique Types" stub with the real `TechniqueTypeWidget`
 * (sibling of `LastTechniquesWidget` in row 1 of the grid); PR 6b
 * replaces these 3 with `RoleBalanceWidget`, `OutcomesWidget`, and
 * `RollFlowWidget`.
 *
 * Span mapping is index-driven (idx 0 → 2 cols, idx 1 → 4 cols, idx 2
 * → 6 cols) to mirror the REQ-BD4 desktop layout: Row 2 = RoleBalance
 * (2) | Outcomes (4), Row 3 = RollFlow (6, full-width).
 */
const STUB_WIDGETS: StubWidgetCopy[] = [
  { title: 'Role Balance', sub: 'Coming in PR 6b' },
  { title: 'Outcomes', sub: 'Coming in PR 6b' },
  { title: 'Roll Flow', sub: 'Coming in PR 6b' },
]

function formatRangeLabel(data: BJJDashboardData | undefined): string {
  if (!data) return DEFAULT_DASHBOARD_WINDOW
  if (data.window === '10r') {
    return `Last ${data.total_workouts} workouts \u00b7 ${data.total_rolls} confirmed rolls`
  }
  if (!data.start_date || !data.end_date) {
    return `${data.total_workouts} workouts \u00b7 ${data.total_rolls} confirmed rolls`
  }
  // YYYY-MM-DD \u2192 "Mon DD" by parsing the strings directly.
  const start = new Date(`${data.start_date}T00:00:00Z`)
  const end = new Date(`${data.end_date}T00:00:00Z`)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return `${fmt(start)} \u2013 ${fmt(end)} \u00b7 ${data.total_workouts} workouts`
}

export function BJJDashboardPage() {
  const mode = useDashboardColorScheme()
  const theme = useMemo(() => createDashboardTheme(mode), [mode])

  const [window, setWindow] = useState<DashboardWindow>(DEFAULT_DASHBOARD_WINDOW)
  const queryClient: QueryClient = useQueryClient()

  const { data, isLoading, isError, error, refetch } = useBJJDashboard(window)

  const handleWindowChange = useCallback((next: DashboardWindow) => {
    setWindow(next)
  }, [])

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: bjjDashboardKeys.lists() })
    void refetch()
  }, [queryClient, refetch])

  const subtitle = formatRangeLabel(data)
  const generatedAt = data?.generated_at ?? '\u2014'

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="page">
        <DashboardPageHeader
          subtitle={subtitle}
          actions={<DashboardTimeFilter window={window} onChange={handleWindowChange} onRefresh={handleRefresh} />}
        />

        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <div className="grid">
            {isError ? (
              <DashboardWidgetShell
                span={6}
                heading="Dashboard"
                error={error ?? new Error('Failed to load dashboard')}
                onRetry={handleRefresh}
              >
                <></>
              </DashboardWidgetShell>
            ) : (
              <>
                {/* Row 1: LastTechniques (span-3) | TechniqueType (span-3) — REQ-BD4 */}
                <DashboardWidgetShell
                  span={3}
                  heading="Last Techniques"
                  sub={`From your ${data?.total_workouts ?? 0} most recent workouts`}
                  data={data?.last_techniques ?? { rows: [] } as LastTechniquesData}
                >
                  {data ? <LastTechniquesWidget data={data.last_techniques} /> : null}
                </DashboardWidgetShell>
                <DashboardWidgetShell
                  span={3}
                  heading="Technique Types"
                  sub={`${data?.total_rolls ?? 0} rolls across categories`}
                  data={data?.technique_types ?? null}
                >
                  {data ? (
                    <TechniqueTypeWidget
                      data={data.technique_types}
                      totalRolls={data.total_rolls}
                    />
                  ) : null}
                </DashboardWidgetShell>
                {/* Row 2 + Row 3: stubbed widgets pending PR 6b (RoleBalance, Outcomes, RollFlow) */}
                {STUB_WIDGETS.map((stub, idx) => (
                  <DashboardWidgetShell
                    key={stub.title}
                    span={idx === 0 ? 2 : idx === 1 ? 4 : 6}
                    heading={stub.title}
                    sub={stub.sub}
                    data={[]}
                  >
                    <></>
                  </DashboardWidgetShell>
                ))}
              </>
            )}
          </div>
        )}

        <DashboardFooter generatedAt={generatedAt} />
      </div>
    </ThemeProvider>
  )
}