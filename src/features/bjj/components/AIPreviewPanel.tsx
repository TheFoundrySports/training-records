import { useBJJTechniques } from '../hooks/useBJJTechniques'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface AIPreview {
  ai_description: string
  matched_technique_ids: string[]
}

interface AIPreviewPanelProps {
  preview: AIPreview
  onApply: () => void
  onDiscard: () => void
}

export function AIPreviewPanel({ preview, onApply, onDiscard }: AIPreviewPanelProps) {
  const { data: techniques = [] } = useBJJTechniques()

  const techniqueNameMap = new Map(techniques.map((t) => [t.id, t.name]))
  const techniqueNameEsMap = new Map(techniques.map((t) => [t.id, t.name_es]))

  function formatName(id: string): string {
    const name = techniqueNameMap.get(id)
    const nameEs = techniqueNameEsMap.get(id)
    if (nameEs) return `${name} / ${nameEs}`
    return name ?? id
  }

  return (
    <div className="rounded-md border bg-muted/50 px-3 py-3 space-y-3">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">AI Enhanced</p>
        <p className="text-sm">{preview.ai_description}</p>
      </div>

      {preview.matched_technique_ids.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Matched Techniques</p>
          <div className="flex flex-wrap gap-1.5">
            {preview.matched_technique_ids.map((id) => (
              <Badge key={id} variant="secondary" className="text-xs">
                {formatName(id)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="button" size="sm" onClick={onApply}>
          Apply
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDiscard}>
          Discard
        </Button>
      </div>
    </div>
  )
}