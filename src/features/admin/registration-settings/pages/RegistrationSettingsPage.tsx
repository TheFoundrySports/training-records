import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { useRegistrationSettings, useUpdateRegistrationSettings } from '../hooks/useRegistrationSettings'
import { useInvitations } from '../hooks/useInvitations'
import { useRevokeUser } from '../hooks/useRevokeUser'
import { useUsers } from '@/features/admin/users/hooks/useUsers'

export function RegistrationSettingsPage() {
  const { data: settings, isLoading: settingsLoading } = useRegistrationSettings()
  const { updateSettings, isLoading: isUpdating } = useUpdateRegistrationSettings()
  const { data: invitations, isLoading: invitationsLoading } = useInvitations()
  const { data: users } = useUsers()
  const { revokeUser, isLoading: isRevoking } = useRevokeUser()

  const [inviteExpiryHours, setInviteExpiryHours] = useState<number>(settings?.invite_expiry_hours ?? 48)
  const [showSaved, setShowSaved] = useState(false)

  async function handleToggleMode(newMode: 'open' | 'invite_only') {
    await updateSettings({ registration_mode: newMode })
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  async function handleSaveExpiry() {
    await updateSettings({ invite_expiry_hours: inviteExpiryHours })
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  async function handleRevokeInvite(invitationId: string) {
    // For now, we don't have a revoke-invite edge function
    // This would need to be added to the design
    console.log('Revoke invitation:', invitationId)
  }

  async function handleBanUser(userId: string) {
    await revokeUser({ userId, action: 'ban' })
  }

  if (settingsLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
      </div>
    )
  }

  const currentMode = settings?.registration_mode ?? 'open'

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <h1 className="text-2xl font-semibold">Registration Settings</h1>

      {/* Mode Toggle */}
      <Card>
        <CardHeader>
          <CardDescription>Control how new users can register</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button
              variant={currentMode === 'open' ? 'default' : 'outline'}
              onClick={() => void handleToggleMode('open')}
              disabled={isUpdating}
            >
              Open Registration
            </Button>
            <Button
              variant={currentMode === 'invite_only' ? 'default' : 'outline'}
              onClick={() => void handleToggleMode('invite_only')}
              disabled={isUpdating}
            >
              Invite Only
            </Button>
          </div>
          {showSaved && (
            <p className="text-sm text-green-600">Settings saved</p>
          )}
        </CardContent>
      </Card>

      {/* Invite Expiry */}
      <Card>
        <CardHeader>
          <CardDescription>Set how long invitations remain valid</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 items-end">
            <div className="space-y-2">
              <Label htmlFor="expiry-hours">Invite Expiry (hours)</Label>
              <Input
                id="expiry-hours"
                type="number"
                min={1}
                max={720}
                value={inviteExpiryHours}
                onChange={(e) => setInviteExpiryHours(parseInt(e.target.value, 10) || 48)}
                className="w-32"
              />
            </div>
            <Button onClick={() => void handleSaveExpiry()} disabled={isUpdating}>
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invitations Table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium">Pending Invitations</h2>
          <CardDescription>Manage sent invitations</CardDescription>
        </CardHeader>
        <CardContent>
          {invitationsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : invitations && invitations.length > 0 ? (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Expires</th>
                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((invite) => (
                    <tr key={invite.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{invite.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{invite.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {invite.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleRevokeInvite(invite.id)}
                            disabled={isRevoking}
                          >
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No invitations found</p>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium">User Access</h2>
          <CardDescription>Ban or restore user access</CardDescription>
        </CardHeader>
        <CardContent>
          {users && users.length > 0 ? (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Role</th>
                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{user.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{user.role}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleBanUser(user.id)}
                          disabled={isRevoking}
                        >
                          Revoke Access
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No users found</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
