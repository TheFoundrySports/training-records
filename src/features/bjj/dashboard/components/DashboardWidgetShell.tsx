/**
 * `DashboardWidgetShell` \u2014 the common wrapper every dashboard widget uses.
 *
 * Responsibilities (T5.11 + REQ-BD5):
 *  1. Apply the `.widget` + `.span-N` layout classes (CSS in
 *     `material-dashboard.css` lines 193-206).
 *  2. Show the heading + sub via the `.widget-head` block.
 *  3. Render the children when data is present and no error/loading.
 *  4. Show a skeleton placeholder while `isLoading` is true.
 *  5. Show an empty-state placeholder when `data` is empty/null AND not
 *     loading AND not errored (REQ-BD5 empty copy).
 *  6. Show an error-state placeholder with a Retry button when `error`
 *     is set; clicking Retry fires `onRetry` so the parent can
 *     `invalidateQueries` and re-fetch.
 *
 * Per-widget isolation:
 *  Each shell owns its own try/catch on render. A throw inside one
 *  widget's children will only affect that widget; siblings continue to
 *  render. The PR 6b/7 widgets can rely on this when they add new
 *  visual elements that might fail (e.g. animation library errors).
 *
 * Why a thin internal try/catch (not `react-error-boundary`):
 *  - `react-error-boundary` is a runtime dependency we don't have.
 *  - The shell's error state is a CONTROLLABLE PROP from the parent
 *    (the parent owns the React Query error and passes it in). The
 *    try/catch here is a SECOND line of defense for render-time throws
 *    inside the children.
 *  - PR 7/9 may upgrade to react-error-boundary if the inline try/catch
 *    proves brittle; the public API stays the same.
 *
 * Refs: T5.11, REQ-BD5 (loading/empty/error states).
 */
import { type ReactNode } from 'react'
import { Alert, Button, Skeleton, Stack } from '@mui/material'
import type { WidgetSpan } from '../types/dashboard.types'

export interface DashboardWidgetShellProps<T> {
  /** Grid column span on desktop (REQ-BD4: 2 / 3 / 4 / 6). */
  span: WidgetSpan
  /** Widget title rendered in the .widget-head block. */
  heading: string
  /** Optional sub-line under the heading (e.g. "from 14 workouts"). */
  sub?: ReactNode
  /**
   * The payload the widget consumes. When this is null/undefined/empty-array,
   * the empty slot is rendered (unless loading or errored).
   */
  data?: T | null
  /** True while the parent's React Query is pending. */
  isLoading?: boolean
  /** Truthy error from the parent's React Query. */
  error?: Error | null
  /** Retry handler \u2014 parent calls `invalidateQueries` to re-fetch. */
  onRetry?: () => void
  /** Empty-state copy override. Defaults to the REQ-BD5 generic copy. */
  emptyCopy?: ReactNode
  /** Slot for the widget's real content. */
  children: ReactNode
}

const DEFAULT_EMPTY_COPY =
  'Log a BJJ workout and confirm rolls in sparring sections to see your evolution.'

function isEmpty<T>(data: T | null | undefined): boolean {
  if (data == null) return true
  if (Array.isArray(data) && data.length === 0) return true
  return false
}

/** Decide which slot to render based on isLoading / error / data. */
function resolveSlot<T>(
  isLoading: boolean | undefined,
  error: Error | null | undefined,
  data: T | null | undefined,
): 'loading' | 'error' | 'empty' | 'content' {
  if (isLoading) return 'loading'
  if (error) return 'error'
  if (isEmpty(data)) return 'empty'
  return 'content'
}

export function DashboardWidgetShell<T>({
  span,
  heading,
  sub,
  data,
  isLoading,
  error,
  onRetry,
  emptyCopy,
  children,
}: DashboardWidgetShellProps<T>) {
  const slot = resolveSlot(isLoading, error, data)

  let body: ReactNode
  switch (slot) {
    case 'loading':
      body = (
        <div className="widget-skeleton" aria-hidden="true">
          <Skeleton variant="text" width="40%" height={28} />
          <Skeleton variant="text" width="70%" height={20} />
          <Stack spacing={1} sx={{ mt: 2 }}>
            <Skeleton variant="rounded" height={36} />
            <Skeleton variant="rounded" height={36} />
          </Stack>
        </div>
      )
      break
    case 'error':
      body = (
        <div className="widget-error">
          <Alert severity="error" action={onRetry ? (
            <Button color="inherit" size="small" onClick={onRetry}>
              Retry
            </Button>
          ) : undefined}>
            {error?.message ?? 'Failed to load widget'}
          </Alert>
        </div>
      )
      break
    case 'empty':
      body = (
        <div className="widget-empty">
          <p>{emptyCopy ?? DEFAULT_EMPTY_COPY}</p>
        </div>
      )
      break
    case 'content':
    default:
      body = <div className="widget-content">{children}</div>
  }

  return (
    <section className={`widget span-${span}`}>
      <WidgetHead heading={heading} sub={sub} />
      {body}
    </section>
  )
}

function WidgetHead({ heading, sub }: { heading: string; sub?: ReactNode }) {
  return (
    <div className="widget-head">
      <div>
        <h2 className="widget-title">{heading}</h2>
        {sub ? <p className="widget-sub">{sub}</p> : null}
      </div>
    </div>
  )
}