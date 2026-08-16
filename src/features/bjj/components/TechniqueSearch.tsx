import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useBJJTechniques } from '../hooks/useBJJTechniques'
import type { BJJCategory, BJJTechnique } from '../bjj.types'

interface TechniqueSearchProps {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

const CATEGORY_LABELS: Record<BJJCategory, string> = {
  guard: 'Guard',
  takedown: 'Takedown',
  submission: 'Submission',
  escape: 'Escape',
  transition: 'Transition',
  guard_pass: 'Pass',
  other: 'Other',
}

function formatCategory(category?: BJJCategory): string | null {
  if (!category) return null
  return CATEGORY_LABELS[category] ?? category
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 3l6 6M9 3 3 9" strokeLinecap="round" />
    </svg>
  )
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
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: allTechniques = [], isLoading: techniquesLoading } = useBJJTechniques()

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value)
    }, 300)
  }, [])

  const { data: results = [] } = useBJJTechniques({ search: debouncedQuery || undefined })

  const techniqueNameById = useMemo(
    () => new Map(allTechniques.map((t) => [t.id, t.name])),
    [allTechniques],
  )
  const techniqueNameEsById = useMemo(
    () => new Map(allTechniques.map((t) => [t.id, t.name_es ?? ''])),
    [allTechniques],
  )

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const selectedSet = new Set(selectedIds)

  function handleSelect(technique: BJJTechnique) {
    if (!selectedSet.has(technique.id)) {
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
    return name ?? id
  }

  return (
    <div ref={containerRef}>
      <div className="search-wrap">
        <input
          id="technique-search-input"
          className="input"
          value={query}
          onChange={(e) => {
            handleQueryChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search techniques…"
          disabled={disabled}
          aria-label="Search techniques"
          aria-expanded={open}
          aria-controls="technique-search-listbox"
          autoComplete="off"
        />

        {open && filteredResults.length > 0 ? (
          <div className="menu-panel">
            <ul
              id="technique-search-listbox"
              role="listbox"
              aria-label="Technique search results"
              className="pick-list"
            >
              {filteredResults.map((technique) => {
                const categoryLabel = formatCategory(technique.category)
                return (
                  <li key={technique.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      className="pick-row"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        handleSelect(technique)
                      }}
                    >
                      <span className="pick-name">{technique.name}</span>
                      {categoryLabel ? (
                        <span className="pick-cat">{categoryLabel}</span>
                      ) : (
                        <span aria-hidden="true" />
                      )}
                      <span className="pick-add" aria-hidden="true">
                        <PlusIcon />
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}

        {open && filteredResults.length === 0 ? (
          <div className="menu-panel">
            <p className="empty-note">No techniques found</p>
          </div>
        ) : null}
      </div>

      {techniquesLoading ? (
        <p className="hint" style={{ marginTop: 'var(--space-3)' }}>
          Loading techniques…
        </p>
      ) : selectedIds.length > 0 ? (
        <div className="selected-chips" aria-label="Selected techniques">
          {selectedIds.map((id) => {
            const name = resolveName(id)
            return (
              <span key={id} className="chip-sel">
                {name}
                <button
                  type="button"
                  aria-label={`Remove ${name}`}
                  className="chip-x"
                  onClick={() => handleRemove(id)}
                  disabled={disabled}
                >
                  <CloseIcon />
                </button>
              </span>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
