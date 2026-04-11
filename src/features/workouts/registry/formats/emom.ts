import React from 'react'
import { z } from 'zod'
import { registerFormat } from '../index'
import type { WodFormSectionProps } from '../types'

export const emomSchema = z.object({}).passthrough()
export type EmomPayload = Record<string, unknown>

function EmomFormSection({ name }: WodFormSectionProps<EmomPayload>): React.ReactElement {
  return React.createElement(
    'div',
    { 'data-testid': `wod-form-section-emom-${name}` },
    'EMOM form section — implementation in Phase 5',
  )
}

registerFormat<EmomPayload>({
  id: 'emom',
  label: 'EMOM',
  scoreType: 'reps',
  defaultPayload: {},
  schema: emomSchema,
  FormSection: EmomFormSection,
})
