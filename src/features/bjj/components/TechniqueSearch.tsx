import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { BJJ_CATEGORIES } from '../bjj.schema'
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
 * TechniqueSearch — controlled combobox with debounced search and category chips.
 * Populates nameMap from allTechniques so IDs set programmatically
 * (via setValue from AI enhance flow) resolve to names immediately.
 */
export function TechniqueSearch({ selectedIds, onChange, disabled }: TechniqueSearchProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<BJJCategory | null>(null)
  const [pickStatus, setPickStatus] = useState('')
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

  const availableCategories = useMemo(() => {
    const present = new Set(
      allTechniques.map((technique) => technique.category).filter(Boolean) as BJJCategory[],
    )
    return BJJ_CATEGORIES.filter((category) => present.has(category))
  }, [allTechniques])

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
      setPickStatus(`Added ${technique.name}`)
    }
    setQuery('')
    setDebouncedQuery('')
    setOpen(false)
  }

  function handleRemove(id: string) {
    const name = techniqueNameById.get(id) ?? id
    onChange(selectedIds.filter((sid) => sid !== id))
    setPickStatus(`Removed ${name}`)
  }

  function handleCategoryToggle(category: BJJCategory) {
    setActiveCategory((current) => (current === category ? null : category))
    setOpen(true)
  }

  const filteredResults = results.filter((technique) => {
    if (selectedSet.has(technique.id)) return false
    if (activeCategory && technique.category !== activeCategory) return false
    return true
  })

  function resolveName(id: string): string {
    const name = techniqueNameById.get(id)
    const nameEs = techniqueNameEsById.get(id)
    if (nameEs) return `${name ?? id} / ${nameEs}`
    return name ?? id
  }

  function emptyMessage(): string {
    if (activeCategory && debouncedQuery.trim()) {
      return `No ${CATEGORY_LABELS[activeCategory].toLowerCase()} techniques match “${debouncedQuery.trim()}”.`
    }
    if (activeCategory) {
      return `No ${CATEGORY_LABELS[activeCategory].toLowerCase()} techniques available.`
    }
    if (debouncedQuery.trim()) {
      return `No techniques match “${debouncedQuery.trim()}”.`
    }
    return 'No techniques found'
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

        {!techniquesLoading && availableCategories.length > 0 ? (
          <div className="chip-filters" role="group" aria-label="Filter by category">
            {availableCategories.map((category) => (
              <button
                key={category}
                type="button"
                className="chip-filter"
                data-active={activeCategory === category ? 'true' : 'false'}
                aria-pressed={activeCategory === category}
                disabled={disabled}
                onClick={() => handleCategoryToggle(category)}
              >
                {CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>
        ) : null}

        {open ? (
          <div className="menu-panel">
            {filteredResults.length > 0 ? (
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
            ) : (
              <p className="empty-note">{emptyMessage()}</p>
            )}
          </div>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {pickStatus}
        {selectedIds.length > 0
          ? ` ${selectedIds.length} technique${selectedIds.length === 1 ? '' : 's'} linked.`
          : ''}
      </p>

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
