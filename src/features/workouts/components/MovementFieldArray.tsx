import type { Control } from 'react-hook-form'
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { ExercisePicker } from './ExercisePicker'

interface MovementFieldArrayProps {
  control: Control<any> // eslint-disable-line @typescript-eslint/no-explicit-any
  name: string
  disabled?: boolean
}

interface MovementRowProps {
  control: Control<any> // eslint-disable-line @typescript-eslint/no-explicit-any
  name: string
  index: number
  fieldId: string
  disabled?: boolean
  onRemove: (index: number) => void
}

const inputClass =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

function MovementRow({ control, name, index, fieldId, disabled, onRemove }: MovementRowProps) {
  const { register, setValue } = useFormContext()

  const exerciseIdPath = `${name}.${index}.exerciseId` as const
  const exerciseNamePath = `${name}.${index}.exerciseName` as const
  const repsPath = `${name}.${index}.reps` as const
  const repSchemePath = `${name}.${index}.repScheme` as const
  const weightPath = `${name}.${index}.weight` as const
  const weightUnitPath = `${name}.${index}.weightUnit` as const

  const exerciseId = useWatch({ control, name: exerciseIdPath })

  return (
    <div
      key={fieldId}
      className="rounded-lg border border-input p-3 space-y-3"
      data-testid={`movement-row-${index}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">Movement {index + 1}</span>
        <button
          type="button"
          onClick={() => onRemove(index)}
          disabled={disabled}
          className="text-xs text-destructive hover:underline disabled:opacity-50"
          aria-label={`Remove movement ${index + 1}`}
        >
          Remove
        </button>
      </div>

      {/* Exercise picker */}
      <ExercisePicker
        value={exerciseId as string}
        onChange={(id, exerciseName) => {
          setValue(exerciseIdPath, id, { shouldValidate: true })
          setValue(exerciseNamePath, exerciseName, { shouldValidate: true })
        }}
        disabled={disabled}
      />
      {/* Hidden inputs to register with RHF */}
      <input type="hidden" {...register(exerciseIdPath)} />
      <input type="hidden" {...register(exerciseNamePath)} />

      {/* Rep Scheme row */}
      <Controller
        control={control}
        name={repSchemePath}
        render={({ field }) => (
          <div className="flex flex-col gap-1">
            <label
              htmlFor={`${name}-${index}-repScheme`}
              className="text-xs font-medium text-muted-foreground"
            >
              Rep Scheme (optional, e.g. 9-7-5)
            </label>
            <input
              id={`${name}-${index}-repScheme`}
              type="text"
              placeholder="e.g. 9-7-5"
              disabled={disabled}
              className={inputClass}
              {...field}
              value={field.value ?? ''}
            />
          </div>
        )}
      />

      {/* Reps + Weight row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${name}-${index}-reps`}
            className="text-xs font-medium text-muted-foreground"
          >
            Reps (optional)
          </label>
          <input
            id={`${name}-${index}-reps`}
            type="number"
            min={1}
            disabled={disabled}
            className={inputClass}
            {...register(repsPath, {
              setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
            })}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${name}-${index}-weight`}
            className="text-xs font-medium text-muted-foreground"
          >
            Weight (optional)
          </label>
          <div className="flex gap-1">
            <input
              id={`${name}-${index}-weight`}
              type="number"
              min={0}
              step="0.5"
              disabled={disabled}
              className={inputClass}
              {...register(weightPath, {
                setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
              })}
            />
            <select
              disabled={disabled}
              className="h-8 w-16 shrink-0 rounded-lg border border-input bg-transparent px-1 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label={`Weight unit for movement ${index + 1}`}
              {...register(weightUnitPath)}
            >
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

export function MovementFieldArray({ control, name, disabled }: MovementFieldArrayProps) {
  const { append, remove, fields } = useFieldArray({ control, name })

  function addMovement() {
    append({
      exerciseId: '',
      exerciseName: '',
      reps: undefined,
      repScheme: undefined,
      weight: undefined,
      weightUnit: 'kg',
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">No movements yet. Add one below.</p>
      )}

      {fields.map((field, index) => (
        <MovementRow
          key={field.id}
          control={control}
          name={name}
          index={index}
          fieldId={field.id}
          disabled={disabled}
          onRemove={remove}
        />
      ))}

      <button
        type="button"
        onClick={addMovement}
        disabled={disabled}
        className="text-sm text-primary hover:underline disabled:opacity-50 self-start"
        aria-label="Add movement"
      >
        + Add movement
      </button>
    </div>
  )
}
