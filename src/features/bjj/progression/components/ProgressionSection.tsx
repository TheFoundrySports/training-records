"use client"

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProgressionSection as ProgressionSectionType } from '../types/belt-progression.types'
import { ProgressionChecklistItem } from './ProgressionChecklistItem'
import { ProgressionProgressBar } from './ProgressionProgressBar'

interface ProgressionSectionProps {
  section: ProgressionSectionType
  checkedMap: Map<string, boolean>
  isExpanded: boolean
  onToggle: (sectionId: string, itemId: string, isComplete: boolean) => void
  onToggleCollapse: (sectionId: string, isExpanded: boolean) => void
}

function ProgressionSection({
  section,
  checkedMap,
  isExpanded,
  onToggle,
  onToggleCollapse,
}: ProgressionSectionProps) {
  const [contentHeight, setContentHeight] = useState<number | 'auto'>('auto')
  const contentRef = useRef<HTMLDivElement>(null)

  // Measure content height for smooth animation
  useEffect(() => {
    if (contentRef.current && isExpanded && contentHeight === 'auto') {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [isExpanded, contentHeight])

  // Count checked items in this section
  const totalItems = section.items.length
  const checkedCount = section.items.filter((item) => checkedMap.get(`${section.id}::${item.id}`)).length

  // Section progress (informational sections always 100%)
  const sectionProgress = section.isInformational
    ? 100
    : totalItems > 0
      ? Math.round((checkedCount / totalItems) * 100)
      : 0

  const handleHeaderClick = () => {
    onToggleCollapse(section.id, !isExpanded)
  }

  const handleHeaderKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggleCollapse(section.id, !isExpanded)
    }
  }

  const contentId = `section-content-${section.id}`

  return (
    <div className="rounded-lg border bg-card">
      {/* Section header */}
      <button
        type="button"
        onClick={handleHeaderClick}
        onKeyDown={handleHeaderKeyDown}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex flex-col gap-1.5">
          <span className="font-medium">{section.title}</span>
          {!section.isInformational && (
            <ProgressionProgressBar
              value={sectionProgress}
              ariaLabel={`${section.title}: ${checkedCount} of ${totalItems} complete`}
              className="w-48"
            />
          )}
          {section.isInformational && (
            <span className="text-xs text-muted-foreground">
              {totalItems} items — informativo
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
            isExpanded && 'rotate-180',
          )}
        />
      </button>

      {/* Collapsible content */}
      <div
        id={contentId}
        aria-hidden={!isExpanded}
        className={cn(
          'overflow-hidden transition-all duration-200',
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none',
        )}
      >
        <div ref={contentRef} className="px-4 pb-4">
          {section.isInformational ? (
            // Informational section: read-only list, no checkboxes
            <div className="flex flex-col gap-1 py-1">
              {section.items.map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-1.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          ) : (
            // Checkable section: render checklist items
            <div className="flex flex-col">
              {renderChecklistItems(section, checkedMap, onToggle)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helper: render checklist items (with grouping if categories exist) ──────
function renderChecklistItems(
  section: ProgressionSectionType,
  checkedMap: Map<string, boolean>,
  onToggle: (sectionId: string, itemId: string, isComplete: boolean) => void,
) {
  // Check if items have categories
  const hasCategories = section.items.some((item) => 'category' in item && item.category)

  if (!hasCategories) {
    // No categories: render flat list
    return section.items.map((item) => (
      <ProgressionChecklistItem
        key={item.id}
        item={item}
        sectionId={section.id}
        isComplete={checkedMap.get(`${section.id}::${item.id}`) ?? false}
        onToggle={onToggle}
      />
    ))
  }

  // Group items by category
  type CategoryGroup = {
    category: string
    label: string
    items: ProgressionSectionType['items']
  }

  const categoryMap = new Map<string, CategoryGroup>()
  const categoryOrder: string[] = []

  // Category labels (Spanish, matching the reference site)
  const categoryLabels: Record<string, string> = {
    takedown: 'Comienzo de la lucha',
    guard_pass: 'Pasados',
    guard: 'Guardia',
    submission: 'Sumisiones',
    escape: 'Escapes y salidas',
  }

  for (const item of section.items) {
    const category = 'category' in item && item.category ? item.category : 'other'
    
    if (!categoryMap.has(category)) {
      categoryOrder.push(category)
      categoryMap.set(category, {
        category,
        label: categoryLabels[category] ?? 'Otros',
        items: [],
      })
    }
    
    categoryMap.get(category)!.items.push(item)
  }

  // Render grouped items with headers
  return categoryOrder.map((category, groupIndex) => {
    const group = categoryMap.get(category)!
    const subsectionNumber = `${section.id === 'tecnicas' ? '2' : section.id}.${groupIndex + 1}`

    return (
      <div key={category} className="flex flex-col">
        {/* Category header */}
        <div className="pb-2 pt-4 first:pt-0">
          <h4 className="text-sm font-semibold text-foreground">
            {subsectionNumber}. {group.label}
          </h4>
        </div>

        {/* Category items */}
        {group.items.map((item) => (
          <ProgressionChecklistItem
            key={item.id}
            item={item}
            sectionId={section.id}
            isComplete={checkedMap.get(`${section.id}::${item.id}`) ?? false}
            onToggle={onToggle}
          />
        ))}
      </div>
    )
  })
}

export { ProgressionSection }