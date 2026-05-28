import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { useAcceptInvite } from '../hooks/useAcceptInvite'

const acceptInviteSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'Passwords do not match',
    path: ['passwordConfirmation'],
  })

type AcceptInviteFormData = z.infer<typeof acceptInviteSchema>

export function AcceptInvitePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { acceptInvite, isLoading, error, isError } = useAcceptInvite()
  const [tokenError, setTokenError] = useState<string | null>(null)
  const errorRef = React.useRef<HTMLParagraphElement>(null)

  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<AcceptInviteFormData>({
    resolver: zodResolver(acceptInviteSchema),
  })

  // Redirect if no token
  React.useEffect(() => {
    if (!token) {
      void navigate('/login')
    }
  }, [token, navigate])

  async function onSubmit(data: AcceptInviteFormData) {
    if (!token) return
    resetForm()
    setTokenError(null)
    try {
      await acceptInvite({
        token,
        password: data.password,
      })
      void navigate('/login?activated=true')
    } catch {
      // error is handled by the hook
      setTimeout(() => errorRef.current?.focus(), 50)
    }
  }

  if (!token) {
    return null
  }

  return (
    <main
      aria-labelledby="accept-invite-heading"
      className="flex min-h-screen items-center justify-center bg-background px-4"
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 id="accept-invite-heading" className="text-2xl font-semibold tracking-tight">
            Set Your Password
          </h1>
          <CardDescription>Create a password to activate your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
              />
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
            {(isError || tokenError) && (error || tokenError) && (
              <p ref={errorRef} role="alert" aria-live="assertive" aria-atomic="true" className="text-sm font-medium text-destructive">
                {error ?? tokenError}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Activating account…' : 'Activate Account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
