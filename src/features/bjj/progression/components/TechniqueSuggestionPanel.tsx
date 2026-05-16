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

// Find the belt progression sectionId+itemId for a given techniqueId
// This requires matching the technique name against the progression sections
function matchTechniqueToProgressionItem(
  suggestion: TechniqueSuggestion,
  progressionItems: Array<{ sectionId: string; itemId: string; label: string; category?: string }>,
): { sectionId: string; itemId: string } | null {
  // Match by name_es (Spanish) first, then name (English)
  for (const item of progressionItems) {
    if (item.label === suggestion.name_es || item.label === suggestion.name) {
      return { sectionId: item.sectionId, itemId: item.itemId }
    }
  }
  return null
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

function TechniqueSuggestionPanel({ userId }: TechniqueSuggestionPanelProps) {
  const { data: suggestions = [], isLoading } = useTechniqueSuggestions(userId)
  const { toggleItem } = useBeltProgression()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  // Load dismissed state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`suggestions_dismissed_${userId}`)
      if (stored) {
        const ids = JSON.parse(stored) as string[]
        setDismissedIds(new Set(ids))
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [userId])

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

  const handleMarkComplete = async (suggestion: TechniqueSuggestion) => {
    // Find the corresponding progression item
    // For blue belt, the section is 'tecnicas'
    // We need to match by name/name_es against the items
    const { PROGRESSION_SECTIONS } = await import('../utils/belt-progression-sections')
    const tecnicasSection = PROGRESSION_SECTIONS.find((s) => s.id === 'tecnicas')
    if (!tecnicasSection) return

    const match = matchTechniqueToProgressionItem(
      suggestion,
      tecnicasSection.items.map((item) => ({
        sectionId: 'tecnicas',
        itemId: item.id,
        label: item.label,
        category: (item as { category?: string }).category,
      })),
    )

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
