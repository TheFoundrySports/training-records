import React from 'react'
import { z } from 'zod'
import { registerFormat } from '../index'
import type { WodFormSectionProps } from '../types'

export const rftSchema = z.object({}).passthrough()
export type RftPayload = Record<string, unknown>

function RftFormSection({ name }: WodFormSectionProps<RftPayload>): React.ReactElement {
  return React.createElement(
    'div',
    { 'data-testid': `wod-form-section-rft-${name}` },
    'RFT form section — implementation in Phase 5',
  )
}

registerFormat<RftPayload>({
  id: 'rft',
  label: 'RFT',
  scoreType: 'time',
  defaultPayload: {},
  schema: rftSchema,
  FormSection: RftFormSection,
})
