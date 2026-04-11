import React from 'react'
import { z } from 'zod'
import { registerFormat } from '../index'
import type { WodFormSectionProps } from '../types'

export const ladderSchema = z.object({}).passthrough()
export type LadderPayload = Record<string, unknown>

function LadderFormSection({ name }: WodFormSectionProps<LadderPayload>): React.ReactElement {
  return React.createElement(
    'div',
    { 'data-testid': `wod-form-section-ladder-${name}` },
    'Ladder form section — implementation in Phase 5',
  )
}

registerFormat<LadderPayload>({
  id: 'ladder',
  label: 'Ladder',
  scoreType: 'reps',
  defaultPayload: {},
  schema: ladderSchema,
  FormSection: LadderFormSection,
})
