import { describe, it, expect } from 'vitest'
import type { FC } from 'react'
import { render, screen } from '@testing-library/react'
import { useForm, FormProvider } from 'react-hook-form'

// Import all formats to trigger side-effect registration
import './index'
import { getFormat } from '../index'

// Generic FormSection type (the WodFormatHandler types are erased at runtime)
interface GenericFormSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any
  name: string
  disabled?: boolean
}
type GenericFormSection = FC<GenericFormSectionProps>

// Helper: render a WodFormSection inside a FormProvider
function renderFormSection(handlerId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const FormSection = (getFormat(handlerId as any) as any).FormSection as GenericFormSection

  function Wrapper() {
    const form = useForm({
      defaultValues: { payload: {} },
    })
    return (
      <FormProvider {...form}>
        <FormSection control={form.control} name="payload" disabled={false} />
      </FormProvider>
    )
  }
  return render(<Wrapper />)
}

describe('FormSection rendering (layout)', () => {
  it('ForTime: rounds and time cap share a grid-2 row', () => {
    renderFormSection('for_time')

    const rounds = screen.getByLabelText(/rounds/i)
    const timeCap = screen.getByLabelText(/time cap/i)

    // Both inputs exist
    expect(rounds).toBeInTheDocument()
    expect(timeCap).toBeInTheDocument()

    // Both inputs share the same .grid-2 ancestor
    const roundsRow = rounds.closest('.grid-2')
    expect(roundsRow).not.toBeNull()
    expect(roundsRow).toBe(timeCap.closest('.grid-2'))
  })

  it('AMRAP: time cap is NOT wrapped in grid-2 (full-width, single field)', () => {
    renderFormSection('amrap')

    const timeCap = screen.getByLabelText(/time cap/i)
    expect(timeCap).toBeInTheDocument()

    // The TimeCap input should NOT have a .grid-2 ancestor
    expect(timeCap.closest('.grid-2')).toBeNull()
  })
})
