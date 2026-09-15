import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { registerFormat } from '../index'
import type { WodFormSectionProps } from '../types'
import { WorkoutMovementSchema } from './workout-movement.schema'
import { MovementFieldArray } from '../../components/MovementFieldArray'

export const forTimeSchema = z.object({
  rounds: z.number().int().positive().max(100).optional(),
  movements: z.array(WorkoutMovementSchema).min(1),
  timeCap: z.number().int().positive().max(60).optional(),
  completionSeconds: z.number().int().min(0).optional(),
})

export type ForTimePayload = z.infer<typeof forTimeSchema>

const inputClass =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

// eslint-disable-next-line react-refresh/only-export-components
function ForTimeFormSection({ control, name, disabled }: WodFormSectionProps<ForTimePayload>) {
  return (
    <div data-testid={`wod-form-section-for-time-${name}`} className="space-y-4">
      <div className="grid-2">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`${name}-rounds`}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Rounds
          </label>
          <Controller
            control={control}
            name={`${name}.rounds`}
            render={({ field }) => (
              <input
                id={`${name}-rounds`}
                type="number"
                min={1}
                max={100}
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
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`${name}-timeCap`}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Time Cap (minutes, optional)
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
      </div>
      <MovementFieldArray control={control} name={`${name}.movements`} disabled={disabled} />
    </div>
  )
}

registerFormat<ForTimePayload>({
  id: 'for_time',
  label: 'For Time',
  scoreType: 'time',
  defaultPayload: {
    rounds: undefined,
    movements: [] as ForTimePayload['movements'],
  } as ForTimePayload,
  schema: forTimeSchema,
  FormSection: ForTimeFormSection,
  normalizeScore: (raw) => ({
    type: 'time',
    value: raw.completionSeconds ?? 0,
    unit: 'seconds',
  }),
})
