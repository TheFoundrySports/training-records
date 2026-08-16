import type { FormProgress } from './useBJJFormProgress'

interface BJJFormActionBarProps {
  progress: FormProgress
  isPending: boolean
  formId: string
  onCancel: () => void
}

export function BJJFormActionBar({
  progress,
  isPending,
  formId,
  onCancel,
}: BJJFormActionBarProps) {
  return (
    <div className="action-bar">
      <div className="shell action-inner">
        <p className="action-status" data-tone={progress.actionTone} role="status">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <circle cx="8" cy="8" r="6.4" />
            <path d="M8 5v4M8 11h0" strokeLinecap="round" />
          </svg>
          <span>{progress.actionMessage}</span>
        </p>
        <div className="action-btns">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={isPending}>
            Cancel
          </button>
          <button
            type="submit"
            form={formId}
            className="btn btn-primary"
            disabled={isPending || !progress.canSubmit}
          >
            {isPending ? 'Saving…' : 'Save workout'}
          </button>
        </div>
      </div>
    </div>
  )
}
