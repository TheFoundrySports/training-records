import { useState, useEffect } from 'react'
import { useExercises } from '@/features/exercises/hooks/useExercises'

interface ExercisePickerProps {
  value: string
  onChange: (id: string, name: string) => void
  disabled?: boolean
}

export function ExercisePicker({ value, onChange, disabled }: ExercisePickerProps) {
  const [inputValue, setInputValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const { data } = useExercises({ q: searchQuery || undefined })
  const exercises = data?.data ?? []

  // When value changes externally, update display name
  useEffect(() => {
    if (value) {
      const match = exercises.find((e) => e.id === value)
      if (match) {
        setInputValue(match.name)
      }
    } else {
      setInputValue('')
    }
    // Only run when value changes — intentionally excluding exercises to avoid overwriting user input
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setInputValue(val)
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
      setInputValue(match.name)
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
        placeholder="Search exercises…"
        autoComplete="off"
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label="Exercise"
      />
      <datalist id="exercise-options">
        {exercises.map((ex) => (
          <option key={ex.id} value={ex.name} />
        ))}
      </datalist>
    </div>
  )
}
