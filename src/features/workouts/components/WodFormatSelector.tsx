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
    <select
      id="wod-format-select"
      value={value}
      onChange={(e) => onChange(e.target.value as WodFormat | '')}
      disabled={disabled}
      className="select"
      aria-label="WOD Format"
    >
      <option value="">None (free text only)</option>
      {formats.map((f) => (
        <option key={f.id} value={f.id}>
          {f.label}
        </option>
      ))}
    </select>
  )
}
