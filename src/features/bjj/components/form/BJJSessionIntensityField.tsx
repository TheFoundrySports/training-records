import type { Control } from 'react-hook-form'
import type { BJJWorkoutFormValues } from '../../bjj.schema'
import { MatFormField } from './MatFormField'

interface BJJSessionIntensityFieldProps {
  control: Control<BJJWorkoutFormValues>
  disabled?: boolean
}

const RANGE_PREVIEW = 5

export function BJJSessionIntensityField({ control, disabled }: BJJSessionIntensityFieldProps) {
  return (
    <MatFormField
      control={control}
      name="rpe"
      label="Intensity (1–10, optional)"
      hint="How hard the session felt overall."
      disabled={disabled}
      render={({ id, field, 'aria-invalid': invalid, 'aria-describedby': describedBy, disabled: fieldDisabled }) => {
        const sliderValue = field.value ?? RANGE_PREVIEW

        return (
          <div className="range-field">
            <div className="range-head">
              <span className="range-val" aria-live="polite">
                {field.value != null ? `${field.value} / 10` : 'Not set'}
              </span>
            </div>
            <input
              id={id}
              type="range"
              className="range-input"
              min={1}
              max={10}
              step={1}
              value={sliderValue}
              aria-invalid={invalid}
              aria-describedby={describedBy}
              aria-valuemin={1}
              aria-valuemax={10}
              aria-valuenow={field.value ?? undefined}
              aria-valuetext={field.value != null ? `${field.value} out of 10` : 'Not set'}
              disabled={fieldDisabled}
              onChange={(event) => {
                field.onChange(Number(event.target.value))
              }}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
            />
            <div className="range-scale" aria-hidden="true">
              <span>Light</span>
              <span>Moderate</span>
              <span>Max</span>
            </div>
            <input
              type="number"
              className="input range-number"
              min={1}
              max={10}
              step={1}
              placeholder="e.g. 7"
              aria-label="Intensity value"
              disabled={fieldDisabled}
              value={field.value ?? ''}
              onChange={(event) => {
                const val = event.target.value
                field.onChange(val === '' ? undefined : Number(val))
              }}
            />
          </div>
        )
      }}
    />
  )
}
