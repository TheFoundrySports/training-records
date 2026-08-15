/**
 * Stroke SVG icons from open-design `template.html` widget-head blocks.
 */
import type { ReactNode } from 'react'

function IconShell({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {children}
    </svg>
  )
}

export function LastTechniquesWidgetIcon() {
  return (
    <IconShell>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </IconShell>
  )
}

export function TechniqueTypeWidgetIcon() {
  return (
    <IconShell>
      <path d="M21 12a9 9 0 11-9-9 9 9 0 019 9z" />
      <path d="M12 3v9h9" />
    </IconShell>
  )
}

export function RoleBalanceWidgetIcon() {
  return (
    <IconShell>
      <path d="M3 12h18M12 3v18" />
    </IconShell>
  )
}

export function OutcomesWidgetIcon() {
  return (
    <IconShell>
      <path d="M12 2l3 7h7l-5.5 4.5 2 7L12 16l-6.5 4.5 2-7L2 9h7z" />
    </IconShell>
  )
}

export function RollFlowWidgetIcon() {
  return (
    <IconShell>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </IconShell>
  )
}
