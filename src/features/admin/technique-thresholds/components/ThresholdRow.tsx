import { useState } from 'react'
import { useUpdateTechniqueThreshold } from '../hooks/useUpdateTechniqueThreshold'
import type { TechniqueWithThreshold } from '../hooks/useTechniqueThresholds'
import { Button } from '@/components/ui/button'

interface ThresholdRowProps {
  technique: TechniqueWithThreshold
}

export function ThresholdRow({ technique }: ThresholdRowProps) {
  const { mutate, isPending } = useUpdateTechniqueThreshold()
  const [value, setValue] = useState(technique.currentThreshold)

  function handleSave() {
    mutate(
      { techniqueId: technique.techniqueId, requiredPractices: value },
      {
        onSuccess: () => {
          // Input will reflect the saved value (no local state update needed,
          // the value state already holds what was saved)
        },
      },
    )
  }

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
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-20 rounded border border-border bg-background px-2 py-1 text-sm"
          aria-label={`Threshold for ${technique.name}`}
        />
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