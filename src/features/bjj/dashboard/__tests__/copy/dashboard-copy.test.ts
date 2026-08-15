import { describe, it, expect } from 'vitest'
import {
  composeDashboardSubtitle,
  DASHBOARD_EYEBROW,
  DASHBOARD_FOOTER_RIGHT,
  WIDGET_COPY,
} from '../../copy/dashboard-copy'

describe('dashboard-copy — open-design template parity (REQ-BD7)', () => {
  it('matches template eyebrow and footer copy', () => {
    expect(DASHBOARD_EYEBROW).toBe('Evolution · active window')
    expect(DASHBOARD_FOOTER_RIGHT).toBe('BJJ Evolution Dashboard · v0.1 · Material UI')
  })

  it('matches template widget headings and subs', () => {
    expect(WIDGET_COPY.lastTechniques.heading).toBe('Recently practiced techniques')
    expect(WIDGET_COPY.lastTechniques.sub).toBe('Sorted by most recent practice')
    expect(WIDGET_COPY.lastTechniques.heroLabel).toBe('distinct techniques practiced')
    expect(WIDGET_COPY.techniqueTypes.heading).toBe('Technique types')
    expect(WIDGET_COPY.techniqueTypes.donutLabel).toBe('Practices')
    expect(WIDGET_COPY.outcomes.heading).toBe('Roll outcomes')
    expect(WIDGET_COPY.rollFlow.heading).toBe('Flujo de rollos')
  })

  it('composes window-specific narrative subtitles (REQ-BD2)', () => {
    expect(composeDashboardSubtitle('30d')).toBe(
      'Your game over 30 days: techniques, role balance, and how your rolls end.',
    )
    expect(composeDashboardSubtitle('7d')).toContain('7 days')
    expect(composeDashboardSubtitle('10r')).toContain('last 10 rolls')
  })
})
