"use client"

import { useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { ComponentProps } from 'react'

interface TechniquePracticeBadgeProps {
  techniqueName?: string
  count: number
  threshold: number
  isLearned: boolean
  onClick: () => void
}

function getBadgeClasses(count: number, threshold: number, isLearned: boolean): string {
  if (count === 0) {
    return 'bg-gray-100 text-gray-500'
  }
  if (count >= threshold) {
    return 'bg-green-500 text-white'
  }
  // 0 < count < threshold
  return 'bg-amber-100 text-amber-700'
}

function buildAriaLabel(techniqueName: string | undefined, count: number, threshold: number, isLearned: boolean): string {
  const name = techniqueName ?? ''
  const status = isLearned ? 'validated' : 'not validated'
  return `${name} practiced ${count} out of ${threshold} times, ${status}`.trim()
}

function TechniquePracticeBadge({
  techniqueName,
  count,
  threshold,
  isLearned,
  onClick,
}: TechniquePracticeBadgeProps) {
  const badgeClasses = getBadgeClasses(count, threshold, isLearned)
  const ariaLabel = buildAriaLabel(techniqueName, count, threshold, isLearned)

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLSpanElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onClick()
      }
    },
    [onClick]
  )

  return (
    <Badge
      data-testid="practice-badge"
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      className={cn('cursor-pointer transition-colors duration-150', badgeClasses)}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {count}/{threshold}
    </Badge>
  )
}

export { TechniquePracticeBadge }