/**
 * `BJJDashboardPage` — the BJJ Evolution Dashboard route component.
 *
 * The RollFlow ("Flujo de rollos") widget is admin-only; athletes see
 * the other 4 widgets but not the roll-flow transitions. Gating happens
 * at render time via `useAuth().role`.
 */
import { useCallback, useMemo, useState } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import '../theme/load-dashboard-styles'
import { createDashboardTheme } from '../theme/mui-dashboard-theme'
import { useDashboardColorScheme } from '../theme/useDashboardColorScheme'
import { useBJJDashboard } from '../hooks/useBJJDashboard'
import { useAuth } from '@/features/auth/AuthContext'
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
import {
  LastTechniquesWidgetIcon,
  TechniqueTypeWidgetIcon,
  RoleBalanceWidgetIcon,
  OutcomesWidgetIcon,
} from '../components/dashboard-widget-icons'
import { composeDashboardSubtitle, WIDGET_COPY } from '../copy/dashboard-copy'
import { readStoredDashboardWindow } from '../utils/readStoredDashboardWindow'
import { composeRollFlowTag } from '../utils/buildRollFlowLanes'
import type { DashboardWindow } from '../types/dashboard.types'
import type { QueryClient } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import type { LastTechniquesData } from '../types/dashboard.types'

export function BJJDashboardPage() {
  const mode = useDashboardColorScheme()
  const theme = useMemo(() => createDashboardTheme(mode), [mode])

  const [window, setWindow] = useState<DashboardWindow>(readStoredDashboardWindow)
  const queryClient: QueryClient = useQueryClient()

  const { data, isLoading, isError, error, refetch } = useBJJDashboard(window)
  const { role } = useAuth()
  const isAdmin = role === 'admin'

  const handleWindowChange = useCallback((next: DashboardWindow) => {
    setWindow(next)
  }, [])

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: bjjDashboardKeys.lists() })
    void refetch()
  }, [queryClient, refetch])

  const subtitle = data?.subtitle ?? composeDashboardSubtitle(window)
  const generatedAt = data?.generated_at ?? '—'

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="page bjj-dashboard">
        <div className="shell">
          <DashboardPageHeader
            subtitle={subtitle}
            actions={
              <DashboardTimeFilter
                window={window}
                onChange={handleWindowChange}
                onRefresh={handleRefresh}
              />
            }
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
                  <DashboardWidgetShell
                    span={3}
                    heading={WIDGET_COPY.lastTechniques.heading}
                    sub={WIDGET_COPY.lastTechniques.sub}
                    icon={<LastTechniquesWidgetIcon />}
                    data={data?.last_techniques ?? ({ rows: [] } as LastTechniquesData)}
                  >
                    {data ? (
                      <LastTechniquesWidget
                        data={data.last_techniques}
                        distinctCount={data.total_techniques}
                      />
                    ) : null}
                  </DashboardWidgetShell>
                  <DashboardWidgetShell
                    span={3}
                    heading={WIDGET_COPY.techniqueTypes.heading}
                    sub={WIDGET_COPY.techniqueTypes.sub}
                    icon={<TechniqueTypeWidgetIcon />}
                    data={data?.technique_types ?? null}
                  >
                    {data ? <TechniqueTypeWidget data={data.technique_types} /> : null}
                  </DashboardWidgetShell>
                  <DashboardWidgetShell
                    span={2}
                    heading={WIDGET_COPY.roleBalance.heading}
                    sub={WIDGET_COPY.roleBalance.sub}
                    icon={<RoleBalanceWidgetIcon />}
                    data={data?.role_balance ?? null}
                  >
                    {data ? <RoleBalanceWidget data={data.role_balance} /> : null}
                  </DashboardWidgetShell>
                  <DashboardWidgetShell
                    span={4}
                    heading={WIDGET_COPY.outcomes.heading}
                    sub={WIDGET_COPY.outcomes.sub}
                    icon={<OutcomesWidgetIcon />}
                    data={data?.outcomes ?? null}
                  >
                    {data ? <OutcomesWidget data={data.outcomes} /> : null}
                  </DashboardWidgetShell>
                  {isAdmin ? (
                    <DashboardWidgetShell
                      span={6}
                      heading={WIDGET_COPY.rollFlow.heading}
                      aside={
                        <span className="tag">
                          {composeRollFlowTag(window, data?.total_rolls ?? 0)}
                        </span>
                      }
                      data={data?.roll_flow ?? null}
                    >
                      {data ? (
                        <RollFlowWidget data={data.roll_flow} window={window} />
                      ) : null}
                    </DashboardWidgetShell>
                  ) : null}
                </>
              )}
            </div>
          )}

          <DashboardFooter generatedAt={generatedAt} />
        </div>
      </div>
    </ThemeProvider>
  )
}
