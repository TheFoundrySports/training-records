// @ts-nocheck — Deno global types not available in editor
import { assert } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { buildSystemPrompt } from '../prompt.ts'

Deno.test('buildSystemPrompt includes each technique id verbatim in the catalog', () => {
  const techniques = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Armbar',
      name_es: 'Llave',
      description: 'Joint lock',
      category: 'submission',
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Triangle',
      name_es: null,
      description: null,
      category: null,
    },
  ]
  const prompt = buildSystemPrompt(techniques)
  assert(prompt.includes('id: 11111111-1111-1111-1111-111111111111'))
  assert(prompt.includes('id: 22222222-2222-2222-2222-222222222222'))
  assert(prompt.includes('Armbar / Llave'))
  assert(prompt.includes('Triangle'))
})

Deno.test('buildSystemPrompt empty catalog placeholder', () => {
  const prompt = buildSystemPrompt([])
  assert(prompt.includes('(no matching techniques found)'))
})
