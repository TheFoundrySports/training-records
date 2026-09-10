import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { usePublicConfig } from './hooks/usePublicConfig'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const errorRef = React.useRef<HTMLParagraphElement>(null)
  const { registrationMode, isLoading: isConfigLoading } = usePublicConfig()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Invalid email or password')
      setIsLoading(false)
      // Move focus to error so screen reader announces it immediately
      setTimeout(() => errorRef.current?.focus(), 50)
    } else {
      void navigate('/workouts')
    }
  }

  return (
    <main
      aria-labelledby="login-heading"
      className="flex min-h-screen items-center justify-center bg-background px-4"
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 id="login-heading" className="text-2xl font-semibold tracking-tight">
            Training Records
          </h1>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
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
              {isLoading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          {!isConfigLoading && registrationMode === 'open' && (
            <>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="text-primary hover:underline">
                  Create one
                </Link>
              </p>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Forgot your password?{' '}
                <Link to="/forgot-password" className="text-primary hover:underline">
                  Reset it
                </Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
