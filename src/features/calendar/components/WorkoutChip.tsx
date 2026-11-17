import { useEffect, useState } from 'react'
import { isAfter } from 'date-fns'
import { useNavigate } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Workout } from '@/features/workouts/workout.types'
import { palettes, type ThemeMode } from '@/features/workouts/theme/material-tokens'

interface WorkoutChipProps {
  workout: Workout
}

const MAX_TITLE_LENGTH = 20

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

/**
 * Reactive shadcn dark-mode observer.
 *
 * Reads `<html class="dark">` and re-renders the chip when the class flips,
 * so category colors track the active theme. Defaults to `'light'` outside
 * the browser (SSR / Vitest without jsdom) — mirrors `readShadcnDarkMode`
 * in the workouts theme module but updates on toggle.
 */
function useResolvedMode(): ThemeMode {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof document === 'undefined') return 'light'
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  })

  useEffect(() => {
    if (typeof document === 'undefined') return
    const el = document.documentElement
    const observer = new MutationObserver(() => {
      setMode(el.classList.contains('dark') ? 'dark' : 'light')
    })
    observer.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return mode
}

export function WorkoutChip({ workout }: WorkoutChipProps) {
  const navigate = useNavigate()
  const mode = useResolvedMode()
  const isPlanned = isAfter(new Date(workout.performedAt), new Date())
  // Reuse the same category palette as the workouts list `WorkoutCard` chip
  // (`features/workouts/pages/WorkoutListPage.tsx`) so calendar and list
  // stay in sync — single source of truth in `material-tokens.ts`.
  const categoryColor = palettes[mode][workout.type]

  function handleClick() {
    void navigate(`/workouts/${workout.id}`)
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-xs hover:bg-muted transition-colors cursor-pointer',
        // Keep the dashed + faded treatment so planned chips remain visually
        // distinct, but tint the dashed border with the category color so
        // type is still recognizable at a glance (issue #100 acceptance).
        isPlanned && 'opacity-70 border border-dashed',
      )}
      style={isPlanned ? { borderColor: categoryColor.main } : undefined}
      aria-label={
        isPlanned ? `View planned workout: ${workout.title}` : `View workout: ${workout.title}`
      }
    >
      <span
        className="truncate flex-1 min-w-0 font-medium"
        style={{ color: categoryColor.main }}
        title={workout.title}
      >
        {truncate(workout.title, MAX_TITLE_LENGTH)}
      </span>
      {isPlanned && (
        <Badge variant="outline" className="shrink-0 text-[10px] h-4 px-1">
          Planned
        </Badge>
      )}
      <Badge
        variant="outline"
        data-testid={`workout-chip-type-${workout.type}`}
        className="shrink-0 capitalize text-[10px] h-4 px-1"
        style={{
          color: categoryColor.main,
          borderColor: categoryColor.main,
          backgroundColor: categoryColor.light,
        }}
      >
        {workout.type}
      </Badge>
    </button>
  )
}