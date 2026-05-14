"use client"

import { useMemo } from 'react'
import { useBeltProgression } from '../hooks/useBeltProgression'
import { useBeltProgressionUIState } from '../hooks/useBeltProgressionUIState'
import { PROGRESSION_SECTIONS, TOTAL_CHECKABLE_ITEMS } from '../utils/belt-progression-sections'
import { calculateProgress } from '../utils/calculateProgress'
import { ProgressionSection } from '../components/ProgressionSection'
import { ProgressionProgressBar } from '../components/ProgressionProgressBar'
import { ProgressionResetButton } from '../components/ProgressionResetButton'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2Icon } from 'lucide-react'

function BeltProgressionPage() {
  const { progression, isLoading: progLoading, error: progError, toggleItem, resetProgress, isResetting } = useBeltProgression()
  const { uiState, isLoading: uiLoading, toggleSection } = useBeltProgressionUIState()

  const isLoading = progLoading || uiLoading

  // Build checkedMap: "sectionId::itemId" → boolean
  const checkedMap = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const item of progression) {
      map.set(`${item.sectionId}::${item.itemId}`, item.isComplete)
    }
    return map
  }, [progression])

  // Build expandedMap: sectionId → isExpanded (from DB state)
  const expandedMap = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const state of uiState) {
      map.set(state.sectionId, state.isExpanded)
    }
    return map
  }, [uiState])

  // Client-side default: all sections collapsed on first visit
  const sectionExpandedMap = useMemo(() => {
    const map = new Map(expandedMap)
    for (const section of PROGRESSION_SECTIONS) {
      if (!map.has(section.id)) {
        map.set(section.id, false) // default: collapsed
      }
    }
    return map
  }, [expandedMap])

  // Global progress
  const totalChecked = useMemo(() => {
    let count = 0
    for (const section of PROGRESSION_SECTIONS) {
      if (section.isInformational) continue
      for (const item of section.items) {
        if (checkedMap.get(`${section.id}::${item.id}`)) {
          count++
        }
      }
    }
    return count
  }, [checkedMap])

  const globalProgress = calculateProgress(totalChecked, TOTAL_CHECKABLE_ITEMS)

  const handleToggle = (sectionId: string, itemId: string, isComplete: boolean) => {
    toggleItem({ sectionId, itemId, isComplete })
  }

  const handleToggleCollapse = (sectionId: string, isExpanded: boolean) => {
    toggleSection({ sectionId, isExpanded })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (progError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-destructive">Error loading progression: {String(progError)}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <div className="flex flex-col gap-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Progreso Cinturón Azul</h1>
          <p className="text-muted-foreground">
            Seguimiento de los 43 requisitos para obtener el cinturón azul.
          </p>
        </div>

        {/* Global progress bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progreso Global</span>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {totalChecked}/{TOTAL_CHECKABLE_ITEMS}
                </span>
              </div>
              <div aria-live="polite" aria-atomic="true">
                <ProgressionProgressBar
                  value={globalProgress}
                  ariaLabel={`Progreso global: ${globalProgress}% — ${totalChecked} de ${TOTAL_CHECKABLE_ITEMS} requisitos completados`}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sections */}
        <div className="flex flex-col gap-3">
          {PROGRESSION_SECTIONS.map((section) => (
            <ProgressionSection
              key={section.id}
              section={section}
              checkedMap={checkedMap}
              isExpanded={sectionExpandedMap.get(section.id) ?? false}
              onToggle={handleToggle}
              onToggleCollapse={handleToggleCollapse}
            />
          ))}
        </div>

        {/* Reset button */}
        <div className="flex justify-end">
          <ProgressionResetButton onReset={resetProgress} isPending={isResetting} />
        </div>
      </div>
    </div>
  )
}

export { BeltProgressionPage }