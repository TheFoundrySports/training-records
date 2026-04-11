import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { usePublicWods } from '@/features/public-wods'
import type { PublicWodFormFields } from '@/features/public-wods'
import type { PublicWod } from '@/features/public-wods'

interface PublicWodPickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (fields: PublicWodFormFields) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  Hero: 'Hero',
  Girl: 'Girl',
  Benchmark: 'Benchmark',
  General: 'General',
}

const CATEGORY_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Hero: 'destructive',
  Girl: 'secondary',
  Benchmark: 'default',
  General: 'outline',
}

function wodToFormFields(wod: PublicWod): PublicWodFormFields {
  return {
    title: wod.title,
    type: wod.type,
    wodFormat: wod.wodFormat,
    wodText: wod.wodText,
    payload: wod.payload,
    durationMinutes: wod.durationMinutes,
  }
}

export function PublicWodPickerModal({ open, onOpenChange, onSelect }: PublicWodPickerModalProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search input — 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const {
    data: wods,
    isLoading,
    isError,
  } = usePublicWods(debouncedSearch ? { q: debouncedSearch } : undefined)

  function handleSelect(wod: PublicWod) {
    onSelect(wodToFormFields(wod))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Load a Public WOD</DialogTitle>
          <DialogDescription>
            Select a benchmark, hero, or reference workout to pre-fill the form.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <Input
          placeholder="Search workouts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        {/* List */}
        <div className="max-h-[400px] overflow-y-auto -mx-4 px-4 space-y-1">
          {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}
          {isError && (
            <p className="py-8 text-center text-sm text-destructive">
              Failed to load workouts. Try again.
            </p>
          )}
          {!isLoading && !isError && wods?.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No workouts found.</p>
          )}
          {!isLoading &&
            !isError &&
            wods?.map((wod) => (
              <button
                key={wod.id}
                type="button"
                onClick={() => handleSelect(wod)}
                className="w-full text-left rounded-lg px-3 py-2.5 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">{wod.title}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {wod.category && (
                      <Badge
                        variant={CATEGORY_VARIANT[wod.category] ?? 'outline'}
                        className="text-xs"
                      >
                        {CATEGORY_LABELS[wod.category] ?? wod.category}
                      </Badge>
                    )}
                    {wod.wodFormat && (
                      <Badge variant="outline" className="text-xs uppercase">
                        {wod.wodFormat}
                      </Badge>
                    )}
                  </div>
                </div>
                {wod.durationMinutes && (
                  <p className="text-xs text-muted-foreground mt-0.5">{wod.durationMinutes} min</p>
                )}
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
