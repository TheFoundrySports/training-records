import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { useCreateUser } from '../hooks/useCreateUser'
import { useCreateInvite } from '../hooks/useCreateInvite'

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
})

type EmailFormData = z.infer<typeof emailSchema>

export function CreateUserPage() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const { createUser, isLoading: isCreating, error: createError } = useCreateUser()
  const { createInvite, isLoading: isInviting, error: inviteError } = useCreateInvite()
  const errorRef = React.useRef<HTMLParagraphElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  })

  async function handleCreateUser(data: EmailFormData) {
    setSuccessMessage(null)
    setInviteUrl(null)
    try {
      const result = await createUser({ email: data.email })
      if (result) {
        setSuccessMessage(`User created successfully (ID: ${result.user_id})`)
        reset()
      }
    } catch {
      setTimeout(() => errorRef.current?.focus(), 50)
    }
  }

  async function handleSendInvite(data: EmailFormData) {
    setSuccessMessage(null)
    setInviteUrl(null)
    try {
      const result = await createInvite({ email: data.email })
      if (result) {
        setInviteUrl(result.invite_url ?? null)
        setSuccessMessage('Invitation sent successfully')
        reset()
      }
    } catch {
      setTimeout(() => errorRef.current?.focus(), 50)
    }
  }

  const hasError = createError || inviteError

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Create User</h1>

      <Card>
        <CardHeader>
          <CardDescription>
            Create a new user directly or send an invitation email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {hasError && (
              <p ref={errorRef} role="alert" aria-live="assertive" aria-atomic="true" className="text-sm font-medium text-destructive">
                {createError ?? inviteError}
              </p>
            )}

            {successMessage && (
              <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 border border-green-200">
                {successMessage}
              </div>
            )}

            {inviteUrl && (
              <div className="space-y-2">
                <Label htmlFor="invite-url">Invitation URL</Label>
                <Input
                  id="invite-url"
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Share this URL with the invited user
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="default"
                disabled={isCreating || isInviting}
                onClick={() => void handleSubmit(handleCreateUser)()}
              >
                {isCreating ? 'Creating…' : 'Create User'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isCreating || isInviting}
                onClick={() => void handleSubmit(handleSendInvite)()}
              >
                {isInviting ? 'Sending…' : 'Send Invite'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
