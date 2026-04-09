import { useState, useMemo } from 'react'
import { useExercises } from '@/features/exercises/hooks/useExercises'

interface ExercisePickerProps {
  value: string
  onChange: (id: string, name: string) => void
  disabled?: boolean
}

export function ExercisePicker({ value, onChange, disabled }: ExercisePickerProps) {
  const [typedValue, setTypedValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading, error } = useExercises({ q: searchQuery || undefined })
  const exercises = useMemo(() => data?.data ?? [], [data])

  // Derive display value: when a UUID is selected and exercises are loaded, show the resolved name.
  // Fall back to whatever the user is typing. This avoids useEffect-driven setState cascades.
  const resolvedName = value ? (exercises.find((e) => e.id === value)?.name ?? '') : ''
  const inputValue = resolvedName || typedValue

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setTypedValue(val)
    setSearchQuery(val)

    // Check if user typed exact match
    const match = exercises.find((ex) => ex.name === val)
    if (match) {
      onChange(match.id, match.name)
    }
  }

  function handleInput(e: React.FormEvent<HTMLInputElement>) {
    // datalist selection fires as input event; check for exact match
    const val = (e.target as HTMLInputElement).value
    const match = exercises.find((ex) => ex.name === val)
    if (match) {
      setTypedValue(match.name)
      setSearchQuery('')
      onChange(match.id, match.name)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="exercise-picker-input"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Exercise
      </label>
      <input
        id="exercise-picker-input"
        type="text"
        list="exercise-options"
        value={inputValue}
        onChange={handleChange}
        onInput={handleInput}
        disabled={disabled}
        placeholder={
          isLoading && exercises.length === 0 ? 'Loading exercises…' : 'Search exercises…'
        }
        autoComplete="off"
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label="Exercise"
      />
      <datalist id="exercise-options">
        {exercises.map((ex) => (
          <option key={ex.id} value={ex.name} />
        ))}
      </datalist>
      {error && <p className="text-xs text-destructive">Failed to load exercises</p>}
    </div>
  )
}
