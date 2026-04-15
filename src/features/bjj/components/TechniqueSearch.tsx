import { useState, useRef, useEffect, useCallback } from 'react'
import { useBJJTechniques } from '../hooks/useBJJTechniques'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import type { BJJTechnique } from '../bjj.types'

interface TechniqueSearchProps {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

/**
 * TechniqueSearch — controlled combobox with 300ms debounce.
 * Stores selected technique names in a plain accumulator map
 * that is updated only in event handlers (not effects or render body)
 * to satisfy react-hooks/refs and react-hooks/set-state-in-effect.
 */
export function TechniqueSearch({ selectedIds, onChange, disabled }: TechniqueSearchProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [open, setOpen] = useState(false)
  // Names are stored as state, updated only when user selects or removes a technique
  const [nameMap, setNameMap] = useState<Record<string, string>>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: results = [] } = useBJJTechniques({ search: debouncedQuery || undefined })

  // Debounce the search query
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value)
    }, 300)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const selectedSet = new Set(selectedIds)

  function handleSelect(technique: BJJTechnique) {
    if (!selectedSet.has(technique.id)) {
      // Record the name when user explicitly selects it
      setNameMap((prev) => ({ ...prev, [technique.id]: technique.name }))
      onChange([...selectedIds, technique.id])
    }
    setQuery('')
    setDebouncedQuery('')
    setOpen(false)
  }

  function handleRemove(id: string) {
    onChange(selectedIds.filter((sid) => sid !== id))
  }

  const filteredResults = results.filter((t) => !selectedSet.has(t.id))

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => {
            handleQueryChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search techniques…"
          disabled={disabled}
          aria-label="Search techniques"
          autoComplete="off"
        />
        {open && query.length > 0 && filteredResults.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-md">
            <ul
              role="listbox"
              aria-label="Technique search results"
              className="max-h-48 overflow-y-auto py-1"
            >
              {filteredResults.map((technique) => (
                <li key={technique.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent focus:bg-accent outline-none"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleSelect(technique)
                    }}
                  >
                    <span className="font-medium">{technique.name}</span>
                    {technique.category && (
                      <span className="ml-2 text-xs text-muted-foreground capitalize">
                        {technique.category}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {open && query.length > 0 && filteredResults.length === 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-md">
            <p className="px-3 py-2 text-sm text-muted-foreground">No techniques found</p>
          </div>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Selected techniques">
          {selectedIds.map((id) => {
            const name = nameMap[id] ?? id
            return (
              <Badge key={id} variant="secondary" className="gap-1">
                {name}
                <button
                  type="button"
                  aria-label={`Remove ${name}`}
                  className="ml-1 rounded-full hover:bg-muted-foreground/20 focus:outline-none"
                  onClick={() => handleRemove(id)}
                  disabled={disabled}
                >
                  &times;
                </button>
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}
