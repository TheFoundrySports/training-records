/**
 * `BJJDashboardPage` — the BJJ Evolution Dashboard route component.
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
 * Grid layout (REQ-BD4 desktop):
 *  Row 1: LastTechniques (span-3) | TechniqueType (span-3)        [PR 5 + PR 6a]
 *  Row 2: RoleBalance (span-2)     | Outcomes (span-4)            [PR 6b]
 *  Row 3: RollFlow (span-6, full-width)                           [PR 6b]
 *
 * Refs: T5.14, T6b.7, REQ-BD1 (route), REQ-BD3 (data shape),
 * REQ-BD4 (grid), REQ-BD5 (loading/empty/error), REQ-BD7 (MUI
 * scoping), REQ-BD9 (React Bits via LastTechniquesWidget's
 * CountUp hero + RollFlowWidget's AnimatedContent bars).
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
import { RoleBalanceWidget } from '../components/RoleBalanceWidget'
import { OutcomesWidget } from '../components/OutcomesWidget'
import { RollFlowWidget } from '../components/RollFlowWidget'
import { DEFAULT_DASHBOARD_WINDOW } from '../components/DashboardTimeFilter.constants'
import type { DashboardWindow } from '../types/dashboard.types'
import type { QueryClient } from '@tanstack/react-query'

// useQueryClient is imported lazily inside the component to avoid pulling
// @tanstack/react-query into the public types if the file is mocked in
// tests.
import { useQueryClient } from '@tanstack/react-query'
import type { LastTechniquesData, BJJDashboardData } from '../types/dashboard.types'

function formatRangeLabel(data: BJJDashboardData | undefined): string {
  if (!data) return DEFAULT_DASHBOARD_WINDOW
  if (data.window === '10r') {
    return `Last ${data.total_workouts} workouts · ${data.total_rolls} confirmed rolls`
  }
  if (!data.start_date || !data.end_date) {
    return `${data.total_workouts} workouts · ${data.total_rolls} confirmed rolls`
  }
  // YYYY-MM-DD → "Mon DD" by parsing the strings directly.
  const start = new Date(`${data.start_date}T00:00:00Z`)
  const end = new Date(`${data.end_date}T00:00:00Z`)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return `${fmt(start)} – ${fmt(end)} · ${data.total_workouts} workouts`
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
  const generatedAt = data?.generated_at ?? '—'

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
                {/* Row 1: LastTechniques (span-3) | TechniqueType (span-3) — REQ-BD4 [PR 5 + PR 6a] */}
                <DashboardWidgetShell
                  span={3}
                  heading="Last Techniques"
                  sub={`From your ${data?.total_workouts ?? 0} most recent workouts`}
                  data={data?.last_techniques ?? ({ rows: [] } as LastTechniquesData)}
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
                {/* Row 2 left: RoleBalance (span-2) — REQ-BD4 [PR 6b] */}
                <DashboardWidgetShell
                  span={2}
                  heading="Role Balance"
                  sub="Attacking vs defending split"
                  data={data?.role_balance ?? null}
                >
                  {data ? <RoleBalanceWidget data={data.role_balance} /> : null}
                </DashboardWidgetShell>
                {/* Row 2 right: Outcomes (span-4) — REQ-BD4 [PR 6b] */}
                <DashboardWidgetShell
                  span={4}
                  heading="Outcomes"
                  sub={`${data?.outcomes.total_rolls ?? 0} confirmed outcomes`}
                  data={data?.outcomes ?? null}
                >
                  {data ? <OutcomesWidget data={data.outcomes} /> : null}
                </DashboardWidgetShell>
                {/* Row 3 full-width: RollFlow (span-6) — REQ-BD4 [PR 6b] */}
                <DashboardWidgetShell
                  span={6}
                  heading="Roll Flow"
                  sub="Top position transitions"
                  data={data?.roll_flow ?? null}
                >
                  {data ? <RollFlowWidget data={data.roll_flow} /> : null}
                </DashboardWidgetShell>
              </>
            )}
          </div>
        )}

        <DashboardFooter generatedAt={generatedAt} />
      </div>
    </ThemeProvider>
  )
}