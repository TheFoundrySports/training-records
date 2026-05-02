import { Button } from '@/components/ui/button'

interface AINotesPreviewPanelProps {
  enhanced_notes: string
  onApply: (notes: string) => void
  onDiscard: () => void
}

export function AINotesPreviewPanel({ enhanced_notes, onApply, onDiscard }: AINotesPreviewPanelProps) {
  return (
    <div className="rounded-md border bg-muted/50 px-3 py-3 space-y-3">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">AI Enhanced</p>
        <p className="text-sm whitespace-pre-wrap">{enhanced_notes}</p>
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          onClick={() => onApply(enhanced_notes)}
        >
          Apply
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onDiscard}
        >
          Discard
        </Button>
      </div>
    </div>
  )
}