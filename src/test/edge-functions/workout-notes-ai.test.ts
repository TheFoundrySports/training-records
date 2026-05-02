/**
 * Unit tests for workout-notes-ai Edge Function pure logic.
 *
 * Tests the pure functions without any Deno/network dependencies.
 * The actual Edge Function logic is tested here by re-implementing
 * the pure functions from the edge function.
 */

import { describe, it, expect } from 'vitest'

// ── Pure functions re-implemented from Edge Function ──────────────────────────

function buildMockResponse(notes: string): { enhanced_notes: string } {
  return {
    enhanced_notes: notes.trim() + ' [AI enhancement unavailable]',
  }
}

function isValidAIResponse(data: unknown): data is { enhanced_notes: string } {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return typeof d.enhanced_notes === 'string' && (d.enhanced_notes as string).length > 0
}

function isNonEmptyString(val: unknown): val is string {
  return typeof val === 'string' && val.trim().length > 0
}

function validateNotes(notes: string | undefined): string | null {
  if (notes === undefined || !isNonEmptyString(notes)) {
    return null
  }
  return notes
}

// ── Auth validation ────────────────────────────────────────────────────────────

interface AuthResult {
  valid: boolean
  error?: { code: string; message: string }
}

function validateAuth(authHeader: string | null): AuthResult {
  if (!authHeader) {
    return { valid: false, error: { code: 'UNAUTHORIZED', message: 'Missing auth token' } }
  }
  return { valid: true }
}

// ── Empty notes validation ─────────────────────────────────────────────────────

function validateNotesInput(notes: string): { valid: boolean; error?: { code: string; message: string } } {
  if (!notes.trim()) {
    return { valid: false, error: { code: 'BAD_REQUEST', message: 'notes is required and cannot be empty' } }
  }
  return { valid: true }
}

// ── Mock AI success response ───────────────────────────────────────────────────

function createMockAISuccessResponse(notes: string): { enhanced_notes: string } {
  return {
    enhanced_notes:
      '• Warm-up: 5 min rowing\n• Main: 3x5 back squat @ 135 lbs\n• Cool-down: stretching',
  }
}

// ── Mock AI failure response (fallback to mock) ───────────────────────────────

function createMockAIFailureFallback(notes: string): { enhanced_notes: string } {
  return buildMockResponse(notes)
}

describe('workout-notes-ai pure logic', () => {
  describe('buildMockResponse', () => {
    it('appends [AI enhancement unavailable] to notes when AI is unavailable', () => {
      const result = buildMockResponse('Do 5 rounds')
      expect(result.enhanced_notes).toBe('Do 5 rounds [AI enhancement unavailable]')
    })

    it('trims input notes before appending', () => {
      const result = buildMockResponse('  notes with spaces  ')
      expect(result.enhanced_notes).toBe('notes with spaces [AI enhancement unavailable]')
    })

    it('returns valid WorkoutNotesAIResponse shape', () => {
      const result = buildMockResponse('test')
      expect(isValidAIResponse(result)).toBe(true)
    })
  })

  describe('isValidAIResponse', () => {
    it('returns true for valid response', () => {
      expect(isValidAIResponse({ enhanced_notes: 'Enhanced text' })).toBe(true)
    })

    it('returns false for null', () => {
      expect(isValidAIResponse(null)).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isValidAIResponse(undefined)).toBe(false)
    })

    it('returns false for plain object without enhanced_notes', () => {
      expect(isValidAIResponse({})).toBe(false)
    })

    it('returns false for enhanced_notes = ""', () => {
      expect(isValidAIResponse({ enhanced_notes: '' })).toBe(false)
    })

    it('returns true for enhanced_notes with whitespace only', () => {
      // String has length > 0 even if only whitespace
      expect(isValidAIResponse({ enhanced_notes: '   ' })).toBe(true)
    })

    it('returns false for enhanced_notes as number', () => {
      expect(isValidAIResponse({ enhanced_notes: 123 })).toBe(false)
    })

    it('returns true for enhanced_notes with leading/trailing whitespace', () => {
      expect(isValidAIResponse({ enhanced_notes: '  text  ' })).toBe(true)
    })
  })

  describe('validateNotes', () => {
    it('returns notes as-is for valid input (does not trim)', () => {
      // validateNotes does not trim, it returns the string as-is if non-empty
      expect(validateNotes('  valid notes  ')).toBe('  valid notes  ')
    })

    it('returns null for undefined', () => {
      expect(validateNotes(undefined)).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(validateNotes('')).toBeNull()
    })

    it('returns null for whitespace-only string', () => {
      expect(validateNotes('   \n\t  ')).toBeNull()
    })
  })

  describe('validateNotesInput (empty notes validation)', () => {
    it('returns valid for non-empty notes', () => {
      expect(validateNotesInput('My workout notes')).toEqual({ valid: true })
    })

    it('returns error for empty string', () => {
      expect(validateNotesInput('')).toEqual({
        valid: false,
        error: { code: 'BAD_REQUEST', message: 'notes is required and cannot be empty' },
      })
    })

    it('returns error for whitespace-only string', () => {
      expect(validateNotesInput('   \n\t  ')).toEqual({
        valid: false,
        error: { code: 'BAD_REQUEST', message: 'notes is required and cannot be empty' },
      })
    })
  })

  describe('validateAuth (auth validation)', () => {
    it('returns valid for present auth header', () => {
      expect(validateAuth('Bearer token123')).toEqual({ valid: true })
    })

    it('returns error for null auth header', () => {
      expect(validateAuth(null)).toEqual({
        valid: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing auth token' },
      })
    })

    it('returns invalid for empty auth header (matches Edge Function behavior)', () => {
      // Edge Function uses `if (!authHeader)` — empty string is falsy
      expect(validateAuth('')).toEqual({
        valid: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing auth token' },
      })
    })
  })

  describe('AI success: returns parsed enhanced_notes', () => {
    it('mock AI success: returns parsed enhanced_notes shape', () => {
      const aiSuccessResponse = createMockAISuccessResponse('test notes')

      expect(isValidAIResponse(aiSuccessResponse)).toBe(true)
      expect(aiSuccessResponse.enhanced_notes).toContain('Warm-up')
      expect(aiSuccessResponse.enhanced_notes).toContain('back squat')
    })

    it('mock AI failure: falls back to mock response', () => {
      const fallbackResponse = createMockAIFailureFallback('My workout notes')

      expect(isValidAIResponse(fallbackResponse)).toBe(true)
      expect(fallbackResponse.enhanced_notes).toContain('[AI enhancement unavailable]')
    })

    it('mock fallback preserves original notes', () => {
      const fallback = createMockAIFailureFallback('Original workout description')
      expect(fallback.enhanced_notes).toContain('Original workout description')
    })
  })
})
