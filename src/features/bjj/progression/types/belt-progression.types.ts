/** Matches belt_progression DB row */
export interface BeltProgressionItem {
  id: string
  userId: string
  beltLevel: 'blue'
  sectionId: string
  itemId: string
  isComplete: boolean
  completedAt: string | null
  techniqueId: string | null
  createdAt: string
  updatedAt: string
}

/** Matches belt_progression_ui_state DB row */
export interface BeltProgressionUIState {
  id: string
  userId: string
  beltLevel: 'blue'
  sectionId: string
  isExpanded: boolean
  updatedAt: string
}

/** Section definition as TypeScript constant (not stored in DB) */
export interface ProgressionSection {
  id: string
  title: string
  isInformational: boolean
  items: ProgressionItem[]
}

/** Item within a section (TypeScript constant, not stored in DB) */
export interface ProgressionItem {
  id: string
  label: string
  techniqueId?: string
  category?: string
}