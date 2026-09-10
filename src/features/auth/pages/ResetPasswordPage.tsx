import React from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter'
import { useResetPassword } from '../hooks/useResetPassword'
import { validateStrongPassword } from '../lib/password-validation'

const resetPasswordSchema = z
  .object({
    password: z.string(),
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'Passwords do not match',
    path: ['passwordConfirmation'],
  })

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const errorRef = React.useRef<HTMLParagraphElement>(null)

  const { resetPassword, isLoading, isSuccess, isError, error } = useResetPassword({
    onSuccess: () => {
      setTimeout(() => navigate('/login?reset=true'), 1500)
    },
    onError: () => {
      setTimeout(() => errorRef.current?.focus(), 50)
    },
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const password = watch('password') ?? ''

  // Validate password in real-time for button disabling
  const passwordValidation = validateStrongPassword(password)

  // Redirect if no token
  React.useEffect(() => {
    if (!token) {
      void navigate('/login')
    }
  }, [token, navigate])

  async function onSubmit(data: ResetPasswordFormData) {
    if (!token) return
    try {
      await resetPassword({ token, new_password: data.password })
    } catch {
      // Error handled by hook
    }
  }

  if (!token) {
    return null
  }

  // Password requirement checklist helpers
  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  return (
    <main
      aria-labelledby="reset-password-heading"
      className="flex min-h-screen items-center justify-center bg-background px-4"
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 id="reset-password-heading" className="text-2xl font-semibold tracking-tight">
            Set New Password
          </h1>
          <CardDescription>Create a new password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-md bg-green-50 p-4 text-sm text-green-800 border border-green-200"
            >
              Password reset successful! Redirecting to login...
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...register('password')}
                />
                <PasswordStrengthMeter password={password} />
              </div>

              {/* Password requirements checklist */}
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="font-medium">Password must include:</p>
                <ul className="space-y-0.5 pl-4">
                  <li className={hasMinLength ? 'text-green-600' : ''}>
                    {hasMinLength ? '✓' : '○'} 8+ characters
                  </li>
                  <li className={hasUppercase ? 'text-green-600' : ''}>
                    {hasUppercase ? '✓' : '○'} Uppercase letter
                  </li>
                  <li className={hasNumber ? 'text-green-600' : ''}>
                    {hasNumber ? '✓' : '○'} Number
                  </li>
                  <li className={hasSymbol ? 'text-green-600' : ''}>
                    {hasSymbol ? '✓' : '○'} Symbol
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="passwordConfirmation">Confirm Password</Label>
                <Input
                  id="passwordConfirmation"
                  type="password"
                  autoComplete="new-password"
                  {...register('passwordConfirmation')}
                />
                {errors.passwordConfirmation && (
                  <p className="text-sm text-destructive">{errors.passwordConfirmation.message}</p>
                )}
              </div>

              {isError && error && (
                <p
                  ref={errorRef}
                  role="alert"
                  aria-live="assertive"
                  className="text-sm font-medium text-destructive"
                >
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !passwordValidation.valid}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
