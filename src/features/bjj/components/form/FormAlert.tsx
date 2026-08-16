interface FormAlertProps {
  tone?: 'info' | 'warn' | 'error'
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

function AlertIcon({ tone }: { tone: FormAlertProps['tone'] }) {
  if (tone === 'error') {
    return (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <circle cx="10" cy="10" r="8" />
        <path d="M10 6.5v4M10 13.5h0" strokeLinecap="round" />
      </svg>
    )
  }

  if (tone === 'warn') {
    return (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M10 2.8 18 17H2z" strokeLinejoin="round" />
        <path d="M10 8v3.4M10 13.8h0" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="10" cy="10" r="8" />
      <path d="M10 9v5M10 6.5h0" strokeLinecap="round" />
    </svg>
  )
}

export function FormAlert({ tone = 'info', children, className, style }: FormAlertProps) {
  const toneClass = tone === 'error' ? 'error' : tone === 'warn' ? 'warn' : ''
  const classes = ['banner', toneClass, className].filter(Boolean).join(' ')

  return (
    <div className={classes} style={style} role={tone === 'error' ? 'alert' : 'status'}>
      <AlertIcon tone={tone} />
      <span>{children}</span>
    </div>
  )
}
