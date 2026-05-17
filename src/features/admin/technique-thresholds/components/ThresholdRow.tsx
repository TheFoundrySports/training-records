import { useState, useCallback } from 'react'
import { useUpdateTechniqueThreshold } from '../hooks/useUpdateTechniqueThreshold'
import type { TechniqueWithThreshold } from '../hooks/useTechniqueThresholds'
import { Button } from '@/components/ui/button'

interface ThresholdRowProps {
  technique: TechniqueWithThreshold
}

const DEFAULT_THRESHOLD = 10

function validateThreshold(raw: string): number | null {
  const num = Number(raw)
  if (!Number.isFinite(num) || num < 1) return null
  return Math.round(num)
}

export function ThresholdRow({ technique }: ThresholdRowProps) {
  const { mutate, isPending } = useUpdateTechniqueThreshold()
  const [value, setValue] = useState(technique.currentThreshold ?? DEFAULT_THRESHOLD)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleChange = useCallback((raw: string) => {
    setErrorMsg(null)
    const validated = validateThreshold(raw)
    if (validated === null && raw !== '') {
      setErrorMsg('Must be a whole number ≥ 1')
    } else {
      setValue(validated ?? value)
    }
  }, [value])

  const handleBlur = useCallback(() => {
    const validated = validateThreshold(String(value))
    if (validated === null) {
      setValue(technique.currentThreshold ?? DEFAULT_THRESHOLD)
      setErrorMsg(null)
    } else {
      setValue(validated)
    }
  }, [value, technique.currentThreshold])

  const handleSave = useCallback(() => {
    const toSave = validateThreshold(String(value))
    if (toSave === null) {
      setErrorMsg('Must be a whole number ≥ 1')
      return
    }
    setErrorMsg(null)
    mutate(
      { techniqueId: technique.techniqueId, requiredPractices: toSave },
      {
        onSuccess: () => {
          // value already holds the saved number — no state update needed
        },
        onError: (err) => {
          setErrorMsg(err instanceof Error ? err.message : 'Save failed')
        },
      },
    )
  }, [mutate, technique.techniqueId, value])

  return (
    <tr>
      <td className="px-4 py-3 font-medium">{technique.name}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {technique.category ?? '—'}
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          min={1}
          max={9999}
          step={1}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          className="w-20 rounded border border-border bg-background px-2 py-1 text-sm data-invalid:border-destructive"
          aria-label={`Threshold for ${technique.name}`}
          aria-invalid={errorMsg !== null}
        />
        {errorMsg && (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {errorMsg}
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isPending}
          variant="default"
        >
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </td>
    </tr>
  )
}