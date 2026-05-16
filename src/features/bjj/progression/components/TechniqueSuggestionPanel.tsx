'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDownIcon, ChevronUpIcon, CheckIcon, XIcon } from 'lucide-react'
import { useTechniqueSuggestions } from '../hooks/useTechniqueSuggestions'
import { useBeltProgression } from '../hooks/useBeltProgression'
import type { TechniqueSuggestion } from '../types/technique-tracking.types'

interface TechniqueSuggestionPanelProps {
  userId: string
}

function normalizeTechniqueKey(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\//g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const TECHNIQUE_TO_PROGRESSION_ITEM: Record<string, { sectionId: string; itemId: string }> = {
  // Takedowns
  [normalizeTechniqueKey('Double Leg')]: { sectionId: 'tecnicas', itemId: 'tecnicas-comienzo-0' },
  [normalizeTechniqueKey('Double Leg Takedown')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-comienzo-0',
  },
  [normalizeTechniqueKey('Derribo por las dos piernas')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-comienzo-0',
  },
  [normalizeTechniqueKey('Single Leg')]: { sectionId: 'tecnicas', itemId: 'tecnicas-comienzo-1' },
  [normalizeTechniqueKey('Single Leg Takedown')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-comienzo-1',
  },
  [normalizeTechniqueKey('Derribo por una pierna')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-comienzo-1',
  },
  [normalizeTechniqueKey('Collar Drag')]: { sectionId: 'tecnicas', itemId: 'tecnicas-comienzo-2' },
  [normalizeTechniqueKey('Arm Drag')]: { sectionId: 'tecnicas', itemId: 'tecnicas-comienzo-2' },
  [normalizeTechniqueKey('Arrastre de solapa')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-comienzo-2',
  },
  [normalizeTechniqueKey('Arrastre de brazo')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-comienzo-2',
  },
  [normalizeTechniqueKey('Guard Pull')]: { sectionId: 'tecnicas', itemId: 'tecnicas-comienzo-3' },
  [normalizeTechniqueKey('Jalon de guardia')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-comienzo-3',
  },

  // Guard passes
  [normalizeTechniqueKey('Abrir la Guardia Cerrada')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-pasados-0',
  },
  [normalizeTechniqueKey('Closed Guard Break')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-pasados-0',
  },
  [normalizeTechniqueKey('Apertura de guardia cerrada')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-pasados-0',
  },
  [normalizeTechniqueKey('Knee Slide & Leg Weave')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-pasados-1',
  },
  [normalizeTechniqueKey('Knee Slide Pass')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-pasados-1',
  },
  [normalizeTechniqueKey('Leg Weave Pass')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-pasados-1',
  },
  [normalizeTechniqueKey('Paso en deslizamiento')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-pasados-1',
  },
  [normalizeTechniqueKey('Paso tejido de pierna')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-pasados-1',
  },
  [normalizeTechniqueKey('Double Under')]: { sectionId: 'tecnicas', itemId: 'tecnicas-pasados-2' },
  [normalizeTechniqueKey('Double Under Pass')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-pasados-2',
  },
  [normalizeTechniqueKey('Paso doble por debajo')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-pasados-2',
  },
  [normalizeTechniqueKey('Leg Drag')]: { sectionId: 'tecnicas', itemId: 'tecnicas-pasados-3' },
  [normalizeTechniqueKey('Leg Drag Pass')]: { sectionId: 'tecnicas', itemId: 'tecnicas-pasados-3' },
  [normalizeTechniqueKey('Arrastre de pierna')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-pasados-3',
  },
  [normalizeTechniqueKey('Toreando')]: { sectionId: 'tecnicas', itemId: 'tecnicas-pasados-4' },
  [normalizeTechniqueKey('Toreando Pass')]: { sectionId: 'tecnicas', itemId: 'tecnicas-pasados-4' },
  [normalizeTechniqueKey('Paso toreo')]: { sectionId: 'tecnicas', itemId: 'tecnicas-pasados-4' },

  // Guards
  [normalizeTechniqueKey('Retencion Basica de Guardia')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-guardia-0',
  },
  [normalizeTechniqueKey('Basic Guard Retention')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-guardia-0',
  },
  [normalizeTechniqueKey('Retencion basica de guardia')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-guardia-0',
  },
  [normalizeTechniqueKey('Collar y Manga')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-guardia-1',
  },
  [normalizeTechniqueKey('Collar and Sleeve Guard')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-guardia-1',
  },
  [normalizeTechniqueKey('Guardia de solapa y manga')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-guardia-1',
  },
  [normalizeTechniqueKey('De La Riva')]: { sectionId: 'tecnicas', itemId: 'tecnicas-guardia-2' },
  [normalizeTechniqueKey('De La Riva Guard')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-guardia-2',
  },
  [normalizeTechniqueKey('Guardia De La Riva')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-guardia-2',
  },
  [normalizeTechniqueKey('Guardia Araña y Lasso')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-guardia-3',
  },
  [normalizeTechniqueKey('Spider Guard')]: { sectionId: 'tecnicas', itemId: 'tecnicas-guardia-3' },
  [normalizeTechniqueKey('Lasso Guard')]: { sectionId: 'tecnicas', itemId: 'tecnicas-guardia-3' },
  [normalizeTechniqueKey('Guardia araña')]: { sectionId: 'tecnicas', itemId: 'tecnicas-guardia-3' },
  [normalizeTechniqueKey('Guardia lazo')]: { sectionId: 'tecnicas', itemId: 'tecnicas-guardia-3' },
  [normalizeTechniqueKey('Guardia Mariposa')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-guardia-4',
  },
  [normalizeTechniqueKey('Butterfly Guard')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-guardia-4',
  },
  [normalizeTechniqueKey('Media Guardia')]: { sectionId: 'tecnicas', itemId: 'tecnicas-guardia-5' },
  [normalizeTechniqueKey('Half Guard')]: { sectionId: 'tecnicas', itemId: 'tecnicas-guardia-5' },
  [normalizeTechniqueKey('Guardia Cerrada')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-guardia-6',
  },
  [normalizeTechniqueKey('Closed Guard')]: { sectionId: 'tecnicas', itemId: 'tecnicas-guardia-6' },
  [normalizeTechniqueKey('Guardia X & Single X')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-guardia-7',
  },
  [normalizeTechniqueKey('X Guard')]: { sectionId: 'tecnicas', itemId: 'tecnicas-guardia-7' },
  [normalizeTechniqueKey('Single Leg X Guard')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-guardia-7',
  },
  [normalizeTechniqueKey('Guardia X')]: { sectionId: 'tecnicas', itemId: 'tecnicas-guardia-7' },
  [normalizeTechniqueKey('Guardia X por una pierna')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-guardia-7',
  },

  // Submissions
  [normalizeTechniqueKey('Triangulo')]: { sectionId: 'tecnicas', itemId: 'tecnicas-sumisiones-0' },
  [normalizeTechniqueKey('Triangle Choke')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-sumisiones-0',
  },
  [normalizeTechniqueKey('Estrangulacion triangulo')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-sumisiones-0',
  },
  [normalizeTechniqueKey('Palanca de Brazo (Armbar)')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-sumisiones-1',
  },
  [normalizeTechniqueKey('Palanca de Brazo')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-sumisiones-1',
  },
  [normalizeTechniqueKey('Armbar')]: { sectionId: 'tecnicas', itemId: 'tecnicas-sumisiones-1' },
  [normalizeTechniqueKey('Llave de codo')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-sumisiones-1',
  },
  [normalizeTechniqueKey('Kimura')]: { sectionId: 'tecnicas', itemId: 'tecnicas-sumisiones-2' },
  [normalizeTechniqueKey('Omoplata')]: { sectionId: 'tecnicas', itemId: 'tecnicas-sumisiones-3' },
  [normalizeTechniqueKey('Cross Choke (Estrangulación Cruzada)')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-sumisiones-4',
  },
  [normalizeTechniqueKey('Cross Choke')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-sumisiones-4',
  },
  [normalizeTechniqueKey('Cross Collar Choke')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-sumisiones-4',
  },
  [normalizeTechniqueKey('Estrangulacion cruzada')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-sumisiones-4',
  },
  [normalizeTechniqueKey('Estrangulacion de solapa')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-sumisiones-4',
  },
  [normalizeTechniqueKey('Mataleon (Rear Naked Choke)')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-sumisiones-5',
  },
  [normalizeTechniqueKey('Mataleon')]: { sectionId: 'tecnicas', itemId: 'tecnicas-sumisiones-5' },
  [normalizeTechniqueKey('Rear Naked Choke')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-sumisiones-5',
  },
  [normalizeTechniqueKey('Estrangulacion dorsal')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-sumisiones-5',
  },
  [normalizeTechniqueKey('Llave de Pie (Botinha / Straight Ankle Lock)')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-sumisiones-6',
  },
  [normalizeTechniqueKey('Llave de Pie')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-sumisiones-6',
  },
  [normalizeTechniqueKey('Botinha')]: { sectionId: 'tecnicas', itemId: 'tecnicas-sumisiones-6' },
  [normalizeTechniqueKey('Straight Ankle Lock')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-sumisiones-6',
  },
  [normalizeTechniqueKey('Llave de tobillo')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-sumisiones-6',
  },

  // Escapes
  [normalizeTechniqueKey('Escape de Montada')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-escapes-0',
  },
  [normalizeTechniqueKey('Mount Escape')]: { sectionId: 'tecnicas', itemId: 'tecnicas-escapes-0' },
  [normalizeTechniqueKey('Escape de monte')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-escapes-0',
  },
  [normalizeTechniqueKey('Escape de Control Lateral')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-escapes-1',
  },
  [normalizeTechniqueKey('Side Control Escape')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-escapes-1',
  },
  [normalizeTechniqueKey('Escape de control lateral')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-escapes-1',
  },
  [normalizeTechniqueKey('Escape de Espalda')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-escapes-2',
  },
  [normalizeTechniqueKey('Back Escape')]: { sectionId: 'tecnicas', itemId: 'tecnicas-escapes-2' },
  [normalizeTechniqueKey('Escape de espalda')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-escapes-2',
  },
  [normalizeTechniqueKey('Escape de Triángulo')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-escapes-3',
  },
  [normalizeTechniqueKey('Triangle Escape')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-escapes-3',
  },
  [normalizeTechniqueKey('Escape de triangulo')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-escapes-3',
  },
  [normalizeTechniqueKey('Escape de Guillotina')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-escapes-4',
  },
  [normalizeTechniqueKey('Guillotine Escape')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-escapes-4',
  },
  [normalizeTechniqueKey('Escape de guillotina')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-escapes-4',
  },
  [normalizeTechniqueKey('Escape de Palanca de Brazo (Armbar)')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-escapes-5',
  },
  [normalizeTechniqueKey('Escape de Palanca de Brazo')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-escapes-5',
  },
  [normalizeTechniqueKey('Armbar Escape')]: { sectionId: 'tecnicas', itemId: 'tecnicas-escapes-5' },
  [normalizeTechniqueKey('Escape de llave de codo')]: {
    sectionId: 'tecnicas',
    itemId: 'tecnicas-escapes-5',
  },
}

// Find the belt progression sectionId+itemId for a suggestion.
// Prefer explicit aliases because suggestion names come from the technique catalog,
// while progression labels are sometimes abbreviated, translated, or combined.
function matchTechniqueToProgressionItem(
  suggestion: TechniqueSuggestion,
): { sectionId: string; itemId: string } | null {
  return (
    TECHNIQUE_TO_PROGRESSION_ITEM[normalizeTechniqueKey(suggestion.name_es)] ??
    TECHNIQUE_TO_PROGRESSION_ITEM[normalizeTechniqueKey(suggestion.name)] ??
    null
  )
}

function SuggestionCard({
  suggestion,
  onMarkComplete,
  onDismiss,
}: {
  suggestion: TechniqueSuggestion
  onMarkComplete: () => void
  onDismiss: () => void
}) {
  return (
    <div
      className="flex items-start gap-3 rounded-lg border p-3"
      data-testid={`suggestion-card-${suggestion.technique_id}`}
    >
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium">{suggestion.name}</p>
            {suggestion.name_es && suggestion.name_es !== suggestion.name && (
              <p className="text-xs text-muted-foreground">{suggestion.name_es}</p>
            )}
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {suggestion.total_practices} practices
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkComplete}
            aria-label={`Mark ${suggestion.name} as complete`}
          >
            <CheckIcon className="size-3 mr-1" />
            Mark as Complete
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onDismiss}
            aria-label={`Dismiss ${suggestion.name}`}
          >
            <XIcon className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function loadDismissedIds(userId: string) {
  try {
    const stored = localStorage.getItem(`suggestions_dismissed_${userId}`)
    if (!stored) return new Set<string>()

    return new Set(JSON.parse(stored) as string[])
  } catch {
    return new Set<string>()
  }
}

function TechniqueSuggestionPanel({ userId }: TechniqueSuggestionPanelProps) {
  const { data: suggestions = [], isLoading } = useTechniqueSuggestions(userId)
  const { toggleItem } = useBeltProgression()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => loadDismissedIds(userId))

  // Persist dismissed IDs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`suggestions_dismissed_${userId}`, JSON.stringify([...dismissedIds]))
    } catch {
      // Ignore localStorage errors
    }
  }, [dismissedIds, userId])

  const filteredSuggestions = useMemo(
    () => suggestions.filter((s) => !dismissedIds.has(s.technique_id)).slice(0, 5),
    [suggestions, dismissedIds],
  )

  const handleDismiss = (techniqueId: string) => {
    setDismissedIds((prev) => new Set([...prev, techniqueId]))
  }

  const handleDismissAll = () => {
    setDismissedIds(new Set(suggestions.map((s) => s.technique_id)))
  }

  const handleMarkComplete = (suggestion: TechniqueSuggestion) => {
    const match = matchTechniqueToProgressionItem(suggestion)

    if (match) {
      toggleItem({ sectionId: match.sectionId, itemId: match.itemId, isComplete: true })
      // Dismiss after marking complete
      handleDismiss(suggestion.technique_id)
    }
  }

  if (isLoading) {
    return (
      <Card data-testid="suggestion-panel-loading">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">Loading suggestions...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="suggestion-panel">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <h2 className="text-base font-medium">Suggested Techniques</h2>
          <p className="text-xs text-muted-foreground">
            Recently practiced techniques not yet in your progression
          </p>
        </div>
        <div className="flex items-center gap-2">
          {filteredSuggestions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissAll}
              aria-label="Dismiss all suggestions"
            >
              Dismiss all
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expand suggestions' : 'Collapse suggestions'}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? (
              <ChevronDownIcon className="size-4" />
            ) : (
              <ChevronUpIcon className="size-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="flex flex-col gap-3">
          {filteredSuggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2" data-testid="empty-suggestions">
              No suggestions available. Keep practicing!
            </p>
          ) : (
            filteredSuggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.technique_id}
                suggestion={suggestion}
                onMarkComplete={() => handleMarkComplete(suggestion)}
                onDismiss={() => handleDismiss(suggestion.technique_id)}
              />
            ))
          )}
        </CardContent>
      )}
    </Card>
  )
}

export { TechniqueSuggestionPanel }
