import React from 'react'
import { z } from 'zod'
import { registerFormat } from '../index'
import type { WodFormSectionProps } from '../types'
import { WorkoutMovementSchema } from './workout-movement.schema'

export const forTimeSchema = z.object({
  rounds: z.number().int().positive().max(50).optional(),
  movements: z.array(WorkoutMovementSchema).min(1),
  timeCap: z.number().int().positive().max(120).optional(),
  completionSeconds: z.number().int().min(0).optional(),
})

export type ForTimePayload = z.infer<typeof forTimeSchema>

function ForTimeFormSection({ name }: WodFormSectionProps<ForTimePayload>): React.ReactElement {
  return React.createElement(
    'div',
    { 'data-testid': `wod-form-section-for-time-${name}` },
    'For Time form section — implementation in Phase 5',
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
