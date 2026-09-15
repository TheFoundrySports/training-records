interface AINotesPreviewPanelProps {
  enhanced_notes: string
  onApply: (notes: string) => void
  onDiscard: () => void
}

export function AINotesPreviewPanel({
  enhanced_notes,
  onApply,
  onDiscard,
}: AINotesPreviewPanelProps) {
  return (
    <div className="card" style={{ padding: 'var(--space-4)' }}>
      <p
        style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 500,
          color: 'var(--muted)',
          marginBottom: 'var(--space-2)',
        }}
      >
        AI Enhanced
      </p>
      <p
        style={{
          fontSize: 'var(--text-sm)',
          whiteSpace: 'pre-wrap',
          marginBottom: 'var(--space-4)',
        }}
      >
        {enhanced_notes}
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => onApply(enhanced_notes)}
        >
          Apply
        </button>
        <button type="button" className="btn btn-sm" onClick={onDiscard}>
          Discard
        </button>
      </div>
    </div>
  )
}
