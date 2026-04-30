import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
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
 * Populates nameMap from allTechniques so IDs set programmatically
 * (via setValue from AI enhance flow) resolve to names immediately.
 */
export function TechniqueSearch({ selectedIds, onChange, disabled }: TechniqueSearchProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [nameMap, setNameMap] = useState<Record<string, string>>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load ALL techniques (no search filter) so we can resolve names for
  // IDs that were set programmatically (e.g., from AI enhance)
  const { data: allTechniques = [], isLoading: techniquesLoading } = useBJJTechniques()

  // Debounce the search query
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value)
    }, 300)
  }, [])

  // Results for the dropdown search
  const { data: results = [] } = useBJJTechniques({ search: debouncedQuery || undefined })

// Build lookups from all techniques for display and name resolution
  const techniqueNameById = useMemo(
    () => new Map(allTechniques.map((t) => [t.id, t.name])),
    [allTechniques],
  )
  const techniqueNameEsById = useMemo(
    () => new Map(allTechniques.map((t) => [t.id, t.name_es ?? ''])),
    [allTechniques],
  )

  // Keep nameMap in sync with allTechniques. Using a ref to track which
  // IDs we've already populated avoids re-merging on every render.
  // nameMap stores both English and Spanish names.
  const populatedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (allTechniques.length === 0) return
    const newEntries: Record<string, string> = {}
    for (const t of allTechniques) {
      if (!populatedRef.current.has(t.id)) {
        newEntries[t.id] = t.name_es ? `${t.name} / ${t.name_es}` : t.name
        populatedRef.current.add(t.id)
      }
    }
    if (Object.keys(newEntries).length > 0) {
      setNameMap((prev) => ({ ...prev, ...newEntries }))
    }
  }, [allTechniques])

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

  function resolveName(id: string): string {
    const name = techniqueNameById.get(id)
    const nameEs = techniqueNameEsById.get(id)
    if (nameEs) return `${name ?? id} / ${nameEs}`
    return name ?? nameMap[id] ?? id
  }

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
        {open && filteredResults.length > 0 && (
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
        {open && filteredResults.length === 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-md">
            <p className="px-3 py-2 text-sm text-muted-foreground">No techniques found</p>
          </div>
        )}
      </div>

      {techniquesLoading ? (
        <p className="text-xs text-muted-foreground">Loading techniques…</p>
      ) : selectedIds.length > 0 ? (
        <div className="flex flex-wrap gap-2" aria-label="Selected techniques">
          {selectedIds.map((id) => {
            const name = resolveName(id)
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
      ) : null}
    </div>
  )
}