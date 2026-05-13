export { BeltProgressionPage } from './pages/BeltProgressionPage'
export { ProgressionSection } from './components/ProgressionSection'
export { ProgressionChecklistItem } from './components/ProgressionChecklistItem'
export { ProgressionProgressBar } from './components/ProgressionProgressBar'
export { ProgressionResetButton } from './components/ProgressionResetButton'
export { useBeltProgression } from './hooks/useBeltProgression'
export { useBeltProgressionUIState } from './hooks/useBeltProgressionUIState'
export { PROGRESSION_SECTIONS, TOTAL_CHECKABLE_ITEMS } from './utils/belt-progression-sections'
export { calculateProgress, calculateSectionProgress } from './utils/calculateProgress'
export type {
  BeltProgressionItem,
  BeltProgressionUIState,
  ProgressionSection,
  ProgressionItem,
} from './types/belt-progression.types'