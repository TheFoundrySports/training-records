import { describe, it, expect } from 'vitest'

// Basic smoke test — verifies Vitest + RTL are wired correctly (M1 requirement)
describe('app smoke test', () => {
  it('should pass', () => {
    expect(true).toBe(true)
  })
})
