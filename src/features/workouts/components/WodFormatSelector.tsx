import '../registry/formats/index'
import { getAllFormats } from '../registry/index'
import type { WodFormat } from '../registry/types'

interface WodFormatSelectorProps {
  value: WodFormat | ''
  onChange: (format: WodFormat | '') => void
  disabled?: boolean
}

export function WodFormatSelector({ value, onChange, disabled }: WodFormatSelectorProps) {
  const formats = getAllFormats()

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="wod-format-select"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        WOD Format
      </label>
      <select
        id="wod-format-select"
        value={value}
        onChange={(e) => onChange(e.target.value as WodFormat | '')}
        disabled={disabled}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label="WOD Format"
      >
        <option value="">None (free text only)</option>
        {formats.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>
    </div>
  )
}
