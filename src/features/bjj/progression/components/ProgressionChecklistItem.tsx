"use client"

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import type { ProgressionItem } from '../types/belt-progression.types'

interface ProgressionChecklistItemProps {
  item: ProgressionItem
  isComplete: boolean
  onToggle: (sectionId: string, itemId: string, isComplete: boolean) => void
  sectionId: string
}

function ProgressionChecklistItem({
  item,
  isComplete,
  onToggle,
  sectionId,
}: ProgressionChecklistItemProps) {
  const handleChange = () => {
    onToggle(sectionId, item.id, !isComplete)
  }

  return (
    <div className="group flex items-start gap-3 py-1.5">
      <div className="relative flex shrink-0">
        <input
          type="checkbox"
          id={item.id}
          checked={isComplete}
          aria-checked={isComplete}
          aria-label={item.label}
          onChange={handleChange}
          className="peer sr-only"
        />
        {/* Visible custom checkbox */}
        <div
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded border transition-colors duration-150',
            isComplete
              ? 'bg-amber-400 border-amber-400'
              : 'border-muted-foreground bg-transparent',
          )}
        >
          {isComplete && <Check className="size-3 text-black" strokeWidth={3} />}
        </div>
        {/* Custom focus ring shown when checkbox is focused */}
        <div className="pointer-events-none absolute inset-0 rounded peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background" />
      </div>
      <label
        htmlFor={item.id}
        className={cn(
          'flex-1 cursor-pointer text-sm leading-relaxed',
          isComplete ? 'text-muted-foreground line-through' : 'text-foreground',
        )}
      >
        {item.label}
      </label>
    </div>
  )
}

export { ProgressionChecklistItem }