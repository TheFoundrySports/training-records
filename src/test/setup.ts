import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Global Supabase mock — prevents real env variable guard from throwing in tests
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }),
    }),
  },
}))
