import React from 'react'
import { z } from 'zod'
import { registerFormat } from '../index'
import type { WodFormSectionProps } from '../types'

export const tabataSchema = z.object({}).passthrough()
export type TabataPayload = Record<string, unknown>

function TabataFormSection({ name }: WodFormSectionProps<TabataPayload>): React.ReactElement {
  return React.createElement(
    'div',
    { 'data-testid': `wod-form-section-tabata-${name}` },
    'Tabata form section — implementation in Phase 5',
  )
}

registerFormat<TabataPayload>({
  id: 'tabata',
  label: 'Tabata',
  scoreType: 'reps',
  defaultPayload: {},
  schema: tabataSchema,
  FormSection: TabataFormSection,
})
