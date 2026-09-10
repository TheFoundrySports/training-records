import { calculatePasswordStrength } from '@/features/auth/lib/password-validation'

interface PasswordStrengthMeterProps {
  password: string
}

const STRENGTH_CONFIG = [
  { label: 'Very Weak', color: 'red' },
  { label: 'Weak', color: 'orange' },
  { label: 'Fair', color: 'yellow' },
  { label: 'Good', color: 'lime' },
  { label: 'Strong', color: 'green' },
] as const

/**
 * Password strength meter component.
 * Displays a color-coded progress bar based on password strength.
 *
 * @param password - The password to evaluate
 */
export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strength = calculatePasswordStrength(password)
  const config = STRENGTH_CONFIG[strength]
  const widthPercent = password ? (strength + 1) * 20 : 0

  if (!password) {
    return null
  }

  return (
    <div className="space-y-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${widthPercent}%`,
            backgroundColor:
              config.color === 'red'
                ? 'hsl(0, 84.2%, 60.2%)'
                : config.color === 'orange'
                  ? 'hsl(25, 95%, 53.1%)'
                  : config.color === 'yellow'
                    ? 'hsl(48, 96%, 53%)'
                    : config.color === 'lime'
                      ? 'hsl(127, 76%, 51%)'
                      : 'hsl(142, 71.4%, 44.3%)',
          }}
        />
      </div>
      <p
        className="text-xs"
        style={{
          color:
            config.color === 'red'
              ? 'hsl(0, 84.2%, 60.2%)'
              : config.color === 'orange'
                ? 'hsl(25, 95%, 53.1%)'
                : config.color === 'yellow'
                  ? 'hsl(48, 96%, 53%)'
                  : config.color === 'lime'
                    ? 'hsl(127, 76%, 51%)'
                    : 'hsl(142, 71.4%, 44.3%)',
        }}
      >
        {config.label}
      </p>
    </div>
  )
}
