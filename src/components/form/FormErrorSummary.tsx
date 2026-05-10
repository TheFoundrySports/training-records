/**
 * Form error summary component for accessible form error announcements.
 * Uses role="alert" with aria-live="assertive" and aria-atomic="true"
 * so screen readers announce errors immediately and completely.
 */
import type { ReactNode } from 'react'

interface FormErrorSummaryProps {
  errors?: string[] | null
  children?: ReactNode
}

/**
 * Top-level form error summary — place at form top on submit failure.
 * Announces all errors atomically so screen reader users hear the full list.
 */
export function FormErrorSummary({ errors, children }: FormErrorSummaryProps) {
  if (!errors || errors.length === 0) {
    return children ? <div>{children}</div> : null
  }

  return (
    <div role="alert" aria-live="assertive" aria-atomic="true" className="space-y-1">
      {children}
      <ul className="list-disc list-inside text-sm text-destructive space-y-1">
        {errors.map((error, i) => (
          <li key={i}>{error}</li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Per-field inline error for use alongside FormControl.
 * Attach via aria-describedby on the input.
 */
export function AnnouncedFieldError({ error }: { error: string }) {
  return (
    <p role="alert" aria-live="polite" className="text-sm text-destructive mt-1">
      {error}
    </p>
  )
}
