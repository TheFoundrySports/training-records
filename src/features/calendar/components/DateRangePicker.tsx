import { format } from 'date-fns'

interface DateRangePickerProps {
  value: { from: string; to: string } | null
  onChange: (range: { from: string; to: string } | null) => void
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const today = format(new Date(), 'yyyy-MM-dd')

  function handleFromChange(e: React.ChangeEvent<HTMLInputElement>) {
    const from = e.target.value
    if (value && from > value.to) {
      // Prevent invalid: from must not be after to
      return
    }
    onChange({ from, to: value?.to ?? '' })
  }

  function handleToChange(e: React.ChangeEvent<HTMLInputElement>) {
    const to = e.target.value
    if (value && to < value.from) {
      // Prevent invalid: to must not be before from
      return
    }
    onChange({ from: value?.from ?? '', to })
  }

  function handleClear() {
    onChange(null)
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={value?.from ?? ''}
        onChange={handleFromChange}
        max={today}
        aria-label="Start date"
        className="rounded border px-2 py-1 text-sm"
      />
      <span className="text-sm text-muted-foreground">–</span>
      <input
        type="date"
        value={value?.to ?? ''}
        onChange={handleToChange}
        max={today}
        aria-label="End date"
        className="rounded border px-2 py-1 text-sm"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear date range"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      )}
    </div>
  )
}