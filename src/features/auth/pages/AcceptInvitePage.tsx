import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
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
  const { acceptInvite, isLoading, error, isError, warning } = useAcceptInvite()
  const [sessionReady, setSessionReady] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const errorRef = React.useRef<HTMLParagraphElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptInviteFormData>({
    resolver: zodResolver(acceptInviteSchema),
  })

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        if (session) {
          setSessionReady(true)
          setSessionError(null)
        } else if (event === 'INITIAL_SESSION') {
          setSessionError(
            'Invalid or expired invitation link. Open the link from your invitation email.',
          )
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function onSubmit(data: AcceptInviteFormData) {
    try {
      await acceptInvite({ password: data.password })
      void navigate('/login?activated=true')
    } catch {
      setTimeout(() => errorRef.current?.focus(), 50)
    }
  }

  if (!sessionReady && !sessionError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-muted-foreground">Verifying invitation…</p>
      </main>
    )
  }

  if (sessionError) {
    return (
      <main
        aria-labelledby="accept-invite-error-heading"
        className="flex min-h-screen items-center justify-center bg-background px-4"
      >
        <Card className="w-full max-w-sm">
          <CardHeader>
            <h1 id="accept-invite-error-heading" className="text-2xl font-semibold tracking-tight">
              Invitation unavailable
            </h1>
            <CardDescription>{sessionError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" className="w-full" onClick={() => void navigate('/login')}>
              Go to login
            </Button>
          </CardContent>
        </Card>
      </main>
    )
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
            {warning && (
              <p
                role="status"
                aria-live="polite"
                className="text-sm font-medium text-yellow-600 dark:text-yellow-400"
              >
                {warning}
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
