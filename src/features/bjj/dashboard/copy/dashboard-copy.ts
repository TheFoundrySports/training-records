/**
 * English copy aligned with open-design `template.html` and REQ-BD10.
 *
 * Source: open-design/5e17c655-dae0-443c-b191-c1967d177f4b/.live-artifacts/bjj-evolution-dashboard/
 */
import type { DashboardWindow } from '../types/dashboard.types'

export const DASHBOARD_PAGE_TITLE = 'BJJ Evolution Dashboard'

export const DASHBOARD_EYEBROW = 'Evolution · active window'

export const DASHBOARD_FOOTER_RIGHT = 'BJJ Evolution Dashboard · v0.1 · Material UI'

export const LAST_TECHNIQUES_VIEW_ALL = 'View all practiced techniques →'

export function composeDashboardSubtitle(window: DashboardWindow): string {
  switch (window) {
    case '7d':
      return 'Your game over 7 days: techniques, role balance, and how your rolls end.'
    case '30d':
      return 'Your game over 30 days: techniques, role balance, and how your rolls end.'
    case '90d':
      return 'Your game over 90 days: techniques, role balance, and how your rolls end.'
    case '10r':
      return 'Your game across your last 10 rolls: techniques, role balance, and how your rolls end.'
  }
}

export const WIDGET_COPY = {
  lastTechniques: {
    heading: 'Recently practiced techniques',
    sub: 'Sorted by most recent practice',
    heroLabel: 'distinct techniques practiced',
  },
  techniqueTypes: {
    heading: 'Technique types',
    sub: 'Grouped by Blue Belt categories',
    donutLabel: 'Practices',
  },
  roleBalance: {
    heading: 'Role balance',
    sub: 'Attacking vs Defending vs Neutral',
  },
  outcomes: {
    heading: 'Roll outcomes',
    sub: 'How your sparring rounds end in this window',
  },
  rollFlow: {
    heading: 'Flujo de rollos',
    ofRolls: 'de rollos',
    mostCommonFinish: 'Finalización más común',
  },
} as const
