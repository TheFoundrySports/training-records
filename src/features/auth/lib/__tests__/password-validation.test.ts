import { describe, it, expect } from 'vitest'
import {
  validateStrongPassword,
  calculatePasswordStrength,
  PASSWORD_REQUIREMENTS,
  PASSWORD_RULES,
} from '../password-validation'

describe('password-validation', () => {
  describe('PASSWORD_REQUIREMENTS', () => {
    it('is a regex that enforces all requirements', () => {
      // Valid password
      expect(PASSWORD_REQUIREMENTS.test('Password1!')).toBe(true)
      // Missing uppercase
      expect(PASSWORD_REQUIREMENTS.test('password1!')).toBe(false)
      // Missing number
      expect(PASSWORD_REQUIREMENTS.test('Password!')).toBe(false)
      // Missing symbol
      expect(PASSWORD_REQUIREMENTS.test('Password1')).toBe(false)
      // Too short
      expect(PASSWORD_REQUIREMENTS.test('Pass1!')).toBe(false)
    })
  })

  describe('PASSWORD_RULES', () => {
    it('has the correct number of rules', () => {
      expect(PASSWORD_RULES).toHaveLength(4)
    })

    it('has rules for length, uppercase, number, and symbol', () => {
      const descriptions = PASSWORD_RULES.map((rule) => rule.description)
      expect(descriptions).toContain('8+ characters')
      expect(descriptions).toContain('Uppercase letter')
      expect(descriptions).toContain('Number')
      expect(descriptions).toContain('Symbol')
    })

    it('each rule has a key, description, and check function', () => {
      PASSWORD_RULES.forEach((rule) => {
        expect(rule).toHaveProperty('key')
        expect(rule).toHaveProperty('description')
        expect(rule).toHaveProperty('check')
        expect(typeof rule.check).toBe('function')
        expect(typeof rule.description).toBe('string')
      })
    })
  })

  describe('validateStrongPassword', () => {
    it('returns valid for a strong password', () => {
      const result = validateStrongPassword('Password1!')
      expect(result.valid).toBe(true)
      expect(result.message).toBeUndefined()
    })

    it('returns invalid for empty password', () => {
      const result = validateStrongPassword('')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Password is required')
    })

    it('returns invalid for password under 8 characters', () => {
      const result = validateStrongPassword('Pass1!')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Password must be at least 8 characters')
    })

    it('returns invalid for password without uppercase', () => {
      const result = validateStrongPassword('password1!')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Password must contain an uppercase letter')
    })

    it('returns invalid for password without number', () => {
      const result = validateStrongPassword('Password!')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Password must contain a number')
    })

    it('returns invalid for password without symbol', () => {
      const result = validateStrongPassword('Password1')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Password must contain a symbol (!@#$%^&*(),.?"{}|<>)')
    })

    it('accepts various symbols', () => {
      const symbols = [
        '!',
        '@',
        '#',
        '$',
        '%',
        '^',
        '&',
        '*',
        '(',
        ')',
        ',',
        '.',
        '?',
        '"',
        ':',
        '{',
        '}',
        '|',
        '<',
        '>',
      ]
      symbols.forEach((symbol) => {
        const result = validateStrongPassword(`Password1${symbol}`)
        expect(result.valid).toBe(true)
      })
    })
  })

  describe('calculatePasswordStrength', () => {
    it('returns 0 for empty password', () => {
      expect(calculatePasswordStrength('')).toBe(0)
    })

    it('returns 0 for very short password', () => {
      expect(calculatePasswordStrength('Pass1!')).toBe(0)
      expect(calculatePasswordStrength('abc')).toBe(0)
    })

    it('returns 1 for password meeting length but missing criteria', () => {
      expect(calculatePasswordStrength('password1!')).toBe(1) // missing uppercase
      expect(calculatePasswordStrength('Password!')).toBe(1) // missing number
      expect(calculatePasswordStrength('Password1')).toBe(1) // missing symbol
    })

    it('returns 4 (Strong) for password meeting all criteria', () => {
      // Password1! meets all requirements: uppercase, number, symbol, 8+ chars
      // This is the threshold for "Strong" (4) per design
      expect(calculatePasswordStrength('Password1!')).toBe(4)
    })

    it('returns 4 (Strong) for password meeting all criteria with good length', () => {
      // StrongPassword123! also meets all requirements
      expect(calculatePasswordStrength('StrongPassword123!')).toBe(4)
    })
  })
})
