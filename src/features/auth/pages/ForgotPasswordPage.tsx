import React, { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { useForgotPassword } from '../hooks/useForgotPassword'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const errorRef = React.useRef<HTMLParagraphElement>(null)

  const { requestReset, isLoading, isSuccess, isError, error } = useForgotPassword({
    onError: () => {
      setTimeout(() => errorRef.current?.focus(), 50)
    },
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEmailError(null)

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      setEmailError('Invalid email address')
      return
    }

    try {
      await requestReset(email)
    } catch {
      // Error handled by hook
    }
  }

  return (
    <main
      aria-labelledby="forgot-password-heading"
      className="flex min-h-screen items-center justify-center bg-background px-4"
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 id="forgot-password-heading" className="text-2xl font-semibold tracking-tight">
            Forgot Password
          </h1>
          <CardDescription>
            Enter your email and we&apos;ll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div className="space-y-4">
              <div
                role="status"
                aria-live="polite"
                className="rounded-md bg-green-50 p-4 text-sm text-green-800 border border-green-200"
              >
                Check your email for a reset link.
              </div>
              <p className="text-center text-sm text-muted-foreground">
                <Link to="/login" className="text-primary hover:underline">
                  Back to login
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
                {emailError && <p className="text-sm text-destructive">{emailError}</p>}
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
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Remember your password?{' '}
                <Link to="/login" className="text-primary hover:underline">
                  Back to login
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
