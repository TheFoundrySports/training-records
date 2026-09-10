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
import { useRegister } from '../hooks/useRegister'

const registerSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/\d/, 'Must contain a number')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain a symbol'),
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'Passwords do not match',
    path: ['passwordConfirmation'],
  })

type RegisterFormData = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { register: registerUser, isLoading, error, isError } = useRegister()
  const errorRef = React.useRef<HTMLParagraphElement>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const password = watch('password') ?? ''

  async function onSubmit(data: RegisterFormData) {
    await registerUser({
      email: data.email,
      password: data.password,
      token: token ?? undefined,
    })
    void navigate('/login?registered=true')
  }

  React.useEffect(() => {
    if (isError && error) {
      setTimeout(() => errorRef.current?.focus(), 50)
    }
  }, [isError, error])

  return (
    <main
      aria-labelledby="register-heading"
      className="flex min-h-screen items-center justify-center bg-background px-4"
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 id="register-heading" className="text-2xl font-semibold tracking-tight">
            Create Account
          </h1>
          <CardDescription>Enter your details to create an account</CardDescription>
        </CardHeader>
        <CardContent>
          {token && (
            <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800 border border-green-200">
              You have been invited to join. Create your account below.
            </div>
          )}
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
              />
              <PasswordStrengthMeter password={password} />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
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
                aria-atomic="true"
                className="text-sm font-medium text-destructive"
              >
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating account…' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
