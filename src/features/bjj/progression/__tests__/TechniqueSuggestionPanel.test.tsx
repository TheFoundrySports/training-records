import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { TechniqueSuggestion } from '../types/technique-tracking.types'
import { TechniqueSuggestionPanel } from '../components/TechniqueSuggestionPanel'

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000'

let mockSuggestions: TechniqueSuggestion[] = []
const mockToggleItem = vi.fn()

vi.mock('../hooks/useTechniqueSuggestions', () => ({
  useTechniqueSuggestions: vi.fn(() => ({
    data: mockSuggestions,
    isLoading: false,
  })),
}))

vi.mock('../hooks/useBeltProgression', () => ({
  useBeltProgression: vi.fn(() => ({
    toggleItem: mockToggleItem,
  })),
}))

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

const suggestions: TechniqueSuggestion[] = [
  {
    technique_id: 't1',
    name: 'Knee Slide Pass',
    name_es: 'Paso en deslizamiento',
    total_practices: 8,
    last_practiced_at: '2026-05-10T10:00:00.000Z',
  },
  {
    technique_id: 't2',
    name: 'Basic Guard Retention',
    name_es: 'Retención básica de guardia',
    total_practices: 5,
    last_practiced_at: '2026-05-08T14:00:00.000Z',
  },
  {
    technique_id: 't3',
    name: 'Armbar',
    name_es: 'Llave de codo',
    total_practices: 12,
    last_practiced_at: '2026-05-05T09:00:00.000Z',
  },
]

describe('TechniqueSuggestionPanel', () => {
  beforeEach(() => {
    mockSuggestions = []
    mockToggleItem.mockReset()
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('renders panel with title', () => {
    mockSuggestions = suggestions

    render(<TechniqueSuggestionPanel userId={MOCK_USER_ID} />)

    expect(screen.getByText('Suggested Techniques')).toBeInTheDocument()
  })

  it('renders up to 5 suggestions when data is present', async () => {
    mockSuggestions = suggestions

    render(<TechniqueSuggestionPanel userId={MOCK_USER_ID} />)

    await waitFor(() => {
      expect(screen.getByText('Knee Slide Pass')).toBeInTheDocument()
    })
    expect(screen.getByText('Basic Guard Retention')).toBeInTheDocument()
    expect(screen.getByText('Armbar')).toBeInTheDocument()
  })

  it('shows empty state when no suggestions', () => {
    render(<TechniqueSuggestionPanel userId={MOCK_USER_ID} />)

    expect(screen.getByTestId('empty-suggestions')).toBeInTheDocument()
  })

  it('renders "Mark as Complete" button per suggestion', async () => {
    mockSuggestions = suggestions

    render(<TechniqueSuggestionPanel userId={MOCK_USER_ID} />)

    await waitFor(() => {
      expect(screen.getByText('Knee Slide Pass')).toBeInTheDocument()
    })

    const buttons = screen.getAllByRole('button', { name: /as complete/i })
    expect(buttons).toHaveLength(3)
  })

  it('marks a matched suggestion as complete in progression', async () => {
    mockSuggestions = suggestions

    render(<TechniqueSuggestionPanel userId={MOCK_USER_ID} />)

    await userEvent.click(screen.getByRole('button', { name: /mark knee slide pass as complete/i }))

    expect(mockToggleItem).toHaveBeenCalledWith({
      sectionId: 'tecnicas',
      itemId: 'tecnicas-pasados-1',
      isComplete: true,
    })
  })

  it('per-item dismiss button sets localStorage', async () => {
    mockSuggestions = suggestions

    render(<TechniqueSuggestionPanel userId={MOCK_USER_ID} />)

    await userEvent.click(screen.getAllByRole('button', { name: /dismiss/i })[0])

    await waitFor(() => {
      expect(
        JSON.parse(localStorageMock.getItem(`suggestions_dismissed_${MOCK_USER_ID}`) ?? '[]'),
      ).toContain('t1')
    })
  })

  it('"Dismiss all" button removes all suggestions from view', async () => {
    mockSuggestions = suggestions

    render(<TechniqueSuggestionPanel userId={MOCK_USER_ID} />)

    await userEvent.click(screen.getByRole('button', { name: /dismiss all/i }))

    await waitFor(() => {
      expect(screen.queryByText('Knee Slide Pass')).not.toBeInTheDocument()
    })
  })

  it('panel starts expanded', () => {
    mockSuggestions = suggestions

    render(<TechniqueSuggestionPanel userId={MOCK_USER_ID} />)

    expect(screen.getByText('Knee Slide Pass')).toBeInTheDocument()
  })

  it('collapse button hides suggestions', async () => {
    mockSuggestions = suggestions

    render(<TechniqueSuggestionPanel userId={MOCK_USER_ID} />)

    await userEvent.click(screen.getByRole('button', { name: /collapse/i }))

    expect(screen.queryByText('Knee Slide Pass')).not.toBeInTheDocument()
  })

  it('expand button shows suggestions again', async () => {
    mockSuggestions = suggestions

    render(<TechniqueSuggestionPanel userId={MOCK_USER_ID} />)

    await userEvent.click(screen.getByRole('button', { name: /collapse/i }))
    expect(screen.queryByText('Knee Slide Pass')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /expand/i }))

    expect(screen.getByText('Knee Slide Pass')).toBeInTheDocument()
  })
})
