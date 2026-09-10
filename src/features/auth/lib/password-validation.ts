/**
 * Password validation library - shared between frontend and backend.
 * Mirrors backend validation logic for defense-in-depth.
 */

export interface ValidationResult {
  valid: boolean
  message?: string
}

/**
 * Password requirements regex.
 * Requires: 8+ chars, lowercase, uppercase, number, and symbol.
 */
export const PASSWORD_REQUIREMENTS =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/

/**
 * Password rules for UI checklist display.
 * Each rule has a unique key, description, and check function.
 */
export interface PasswordRule {
  key: string
  description: string
  check: (password: string) => boolean
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    key: 'length',
    description: '8+ characters',
    check: (password: string) => password.length >= 8,
  },
  {
    key: 'uppercase',
    description: 'Uppercase letter',
    check: (password: string) => /[A-Z]/.test(password),
  },
  {
    key: 'number',
    description: 'Number',
    check: (password: string) => /\d/.test(password),
  },
  {
    key: 'symbol',
    description: 'Symbol',
    check: (password: string) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
  },
]

/**
 * Validate password meets strong requirements.
 * Used by: useResetPassword, useRegister, useAcceptInvite hooks.
 *
 * @param password - The password to validate
 * @returns ValidationResult with valid=true if password meets all requirements
 */
export function validateStrongPassword(password: string): ValidationResult {
  if (!password) {
    return { valid: false, message: 'Password is required' }
  }

  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' }
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain an uppercase letter' }
  }

  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain a number' }
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, message: 'Password must contain a symbol (!@#$%^&*(),.?"{}|<>)' }
  }

  return { valid: true }
}

/**
 * Calculate password strength score (0-4).
 * Used by: PasswordStrengthMeter component.
 *
 * @param password - The password to evaluate
 * @returns Strength score:
 *   0 = Very Weak (too short)
 *   1 = Weak (length OK but missing criteria)
 *   2 = Fair (all criteria met)
 *   3 = Good (all criteria + good length)
 *   4 = Strong (all criteria + excellent length/complexity)
 */
export function calculatePasswordStrength(password: string): number {
  if (password.length < 8) return 0
  if (!PASSWORD_REQUIREMENTS.test(password)) return 1

  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  const criteriaCount = [hasUppercase, hasNumber, hasSymbol].filter(Boolean).length

  if (criteriaCount === 1) return 2 // Fair
  if (criteriaCount === 2) return 3 // Good
  return 4 // Strong
}
