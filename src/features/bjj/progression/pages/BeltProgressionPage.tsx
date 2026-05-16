"use client"

import { useMemo, useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { useBeltProgression } from '../hooks/useBeltProgression'
import { useBeltProgressionUIState } from '../hooks/useBeltProgressionUIState'
import { useTechniqueLearningStatus } from '../hooks/useTechniqueLearningStatus'
import { useTechniqueSuggestions } from '../hooks/useTechniqueSuggestions'
import { PROGRESSION_SECTIONS, TOTAL_CHECKABLE_ITEMS } from '../utils/belt-progression-sections'
import { calculateProgress } from '../utils/calculateProgress'
import { ProgressionSection } from '../components/ProgressionSection'
import { ProgressionProgressBar } from '../components/ProgressionProgressBar'
import { ProgressionResetButton } from '../components/ProgressionResetButton'
import { TechniqueSuggestionPanel } from '../components/TechniqueSuggestionPanel'
import { TechniquePracticeModal } from '../components/TechniquePracticeModal'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2Icon } from 'lucide-react'
import type { TechniqueLearningStatus } from '../types/technique-tracking.types'

function BeltProgressionPage() {
  const { user } = useAuth()
  const { progression, isLoading: progLoading, error: progError, toggleItem, resetProgress, isResetting } = useBeltProgression()
  const { uiState, isLoading: uiLoading, toggleSection } = useBeltProgressionUIState()

  // Technique learning status (for practice badges)
  const { data: techniqueStatuses = [] } = useTechniqueLearningStatus(user?.id ?? '')

  // Technique suggestions (for suggestion panel)
  const { data: suggestions = [] } = useTechniqueSuggestions(user?.id ?? '')

  const [modalState, setModalState] = useState<{
    techniqueId: string
    techniqueName: string
    open: boolean
  }>({
    techniqueId: '',
    techniqueName: '',
    open: false,
  })

  const isLoading = progLoading || uiLoading

  // Build checkedMap: "sectionId::itemId" → boolean
  const checkedMap = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const item of progression) {
      map.set(`${item.sectionId}::${item.itemId}`, item.isComplete)
    }
    return map
  }, [progression])

  // Build technique status map: "name_es | name" → TechniqueLearningStatus
  const techniqueStatusMap = useMemo(() => {
    const map = new Map<string, TechniqueLearningStatus>()
    for (const status of techniqueStatuses) {
      if (status.name_es) map.set(status.name_es, status)
      if (status.name) map.set(status.name, status)
    }
    return map
  }, [techniqueStatuses])

  // Build practiceData map: "sectionId::itemId" → practiceData + techniqueId
  const practiceDataMap = useMemo(() => {
    const map = new Map<string, { count: number; threshold: number; isLearned: boolean; techniqueId: string }>()
    for (const section of PROGRESSION_SECTIONS) {
      for (const item of section.items) {
        const key = `${section.id}::${item.id}`
        const status = techniqueStatusMap.get(item.label)
        if (status) {
          map.set(key, {
            count: status.total_practices,
            threshold: status.required_practices,
            isLearned: status.is_learned,
            techniqueId: status.technique_id,
          })
        }
      }
    }
    return map
  }, [techniqueStatusMap])

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

  const handlePracticeBadgeClick = (techniqueId: string, techniqueName: string) => {
    setModalState({ techniqueId, techniqueName, open: true })
  }

  const handleModalClose = () => {
    setModalState((prev) => ({ ...prev, open: false }))
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

        {/* Suggestion panel */}
        <TechniqueSuggestionPanel userId={user?.id ?? ''} />

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
              practiceDataMap={practiceDataMap}
              onPracticeBadgeClick={handlePracticeBadgeClick}
            />
          ))}
        </div>

        {/* Reset button */}
        <div className="flex justify-end">
          <ProgressionResetButton onReset={resetProgress} isPending={isResetting} />
        </div>
      </div>

      {/* Practice modal — mounted at page root */}
      <TechniquePracticeModal
        techniqueId={modalState.techniqueId}
        techniqueName={modalState.techniqueName}
        open={modalState.open}
        onClose={handleModalClose}
      />
    </div>
  )
}

export { BeltProgressionPage }