import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AIPreviewPanel } from '../components/AIPreviewPanel'
import { useBJJTechniques } from '../hooks/useBJJTechniques'
import type { BJJTechnique } from '../bjj.types'

vi.mock('../hooks/useBJJTechniques', () => ({
  useBJJTechniques: vi.fn(),
}))

const baseTechnique = (overrides: Partial<BJJTechnique>): BJJTechnique => ({
  id: 'id-default',
  name: 'Default',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('AIPreviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows bilingual label when name_es is present', () => {
    vi.mocked(useBJJTechniques).mockReturnValue({
      data: [baseTechnique({ id: 't1', name: 'Armbar', name_es: 'Llave de brazo' })],
      isLoading: false,
      isPending: false,
      isError: false,
      isSuccess: true,
      status: 'success',
      fetchStatus: 'idle',
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useBJJTechniques>)

    render(
      <AIPreviewPanel
        preview={{ ai_description: 'Sesión de suelo', matched_technique_ids: ['t1'] }}
        onApply={vi.fn()}
        onDiscard={vi.fn()}
      />,
    )

    expect(screen.getByText('Armbar / Llave de brazo')).toBeInTheDocument()
  })

  it('shows English-only name when name_es is absent', () => {
    vi.mocked(useBJJTechniques).mockReturnValue({
      data: [baseTechnique({ id: 't2', name: 'Triangle choke' })],
      isLoading: false,
      isPending: false,
      isError: false,
      isSuccess: true,
      status: 'success',
      fetchStatus: 'idle',
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useBJJTechniques>)

    render(
      <AIPreviewPanel
        preview={{ ai_description: 'Guard work', matched_technique_ids: ['t2'] }}
        onApply={vi.fn()}
        onDiscard={vi.fn()}
      />,
    )

    expect(screen.getByText('Triangle choke')).toBeInTheDocument()
  })

  it('shows Unknown technique when id is not in the catalog', () => {
    vi.mocked(useBJJTechniques).mockReturnValue({
      data: [baseTechnique({ id: 't3', name: 'Kimura' })],
      isLoading: false,
      isPending: false,
      isError: false,
      isSuccess: true,
      status: 'success',
      fetchStatus: 'idle',
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useBJJTechniques>)

    render(
      <AIPreviewPanel
        preview={{ ai_description: 'Drilling', matched_technique_ids: ['unknown-uuid'] }}
        onApply={vi.fn()}
        onDiscard={vi.fn()}
      />,
    )

    expect(screen.getByText('Unknown technique')).toBeInTheDocument()
  })

  it('calls onApply and onDiscard', async () => {
    vi.mocked(useBJJTechniques).mockReturnValue({
      data: [],
      isLoading: false,
      isPending: false,
      isError: false,
      isSuccess: true,
      status: 'success',
      fetchStatus: 'idle',
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useBJJTechniques>)

    const onApply = vi.fn()
    const onDiscard = vi.fn()
    const user = userEvent.setup()

    render(
      <AIPreviewPanel
        preview={{ ai_description: 'Test', matched_technique_ids: [] }}
        onApply={onApply}
        onDiscard={onDiscard}
      />,
    )

    await user.click(screen.getByRole('button', { name: /^apply$/i }))
    await user.click(screen.getByRole('button', { name: /^discard$/i }))

    expect(onApply).toHaveBeenCalledOnce()
    expect(onDiscard).toHaveBeenCalledOnce()
  })
})
