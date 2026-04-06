import React from 'react'
import { z } from 'zod'
import { registerFormat } from '../index'
import type { WodFormSectionProps } from '../types'
import { WorkoutMovementSchema } from './workout-movement.schema'

export const amrapSchema = z.object({
  timeCap: z.number().int().positive().max(60),
  movements: z.array(WorkoutMovementSchema).min(1),
  roundsCompleted: z.number().int().min(0).optional(),
  partialReps: z.number().int().min(0).optional(),
})

export type AmrapPayload = z.infer<typeof amrapSchema>

function AmrapFormSection({ name }: WodFormSectionProps<AmrapPayload>): React.ReactElement {
  return React.createElement(
    'div',
    { 'data-testid': `wod-form-section-amrap-${name}` },
    'AMRAP form section — implementation in Phase 5',
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
