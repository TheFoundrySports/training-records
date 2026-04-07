import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { registerFormat } from '../index'
import type { WodFormSectionProps } from '../types'
import { WorkoutMovementSchema } from './workout-movement.schema'
import { MovementFieldArray } from '../../components/MovementFieldArray'

export const amrapSchema = z.object({
  timeCap: z.number().int().positive().max(60),
  movements: z.array(WorkoutMovementSchema).min(1),
  roundsCompleted: z.number().int().min(0).optional(),
  partialReps: z.number().int().min(0).optional(),
})

export type AmrapPayload = z.infer<typeof amrapSchema>

const inputClass =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

// eslint-disable-next-line react-refresh/only-export-components
function AmrapFormSection({ control, name, disabled }: WodFormSectionProps<AmrapPayload>) {
  return (
    <div data-testid={`wod-form-section-amrap-${name}`} className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${name}-timeCap`}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Time Cap (minutes)
        </label>
        <Controller
          control={control}
          name={`${name}.timeCap`}
          render={({ field }) => (
            <input
              id={`${name}-timeCap`}
              type="number"
              min={1}
              max={60}
              disabled={disabled}
              className={inputClass}
              value={field.value ?? ''}
              onChange={(e) =>
                field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
              }
            />
          )}
        />
      </div>
      <MovementFieldArray control={control} name={`${name}.movements`} disabled={disabled} />
    </div>
  )
}

registerFormat<AmrapPayload>({
  id: 'amrap',
  label: 'AMRAP',
  scoreType: 'rounds',
  defaultPayload: { timeCap: 20, movements: [] as AmrapPayload['movements'] } as AmrapPayload,
  schema: amrapSchema,
  FormSection: AmrapFormSection,
  normalizeScore: (raw) => ({
    type: 'rounds',
    value: (raw.roundsCompleted ?? 0) + (raw.partialReps ? 0.01 * raw.partialReps : 0),
  }),
})
