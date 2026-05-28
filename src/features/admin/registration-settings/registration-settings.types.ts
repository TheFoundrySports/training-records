export interface RegistrationSettings {
  registration_mode: 'open' | 'invite_only'
  invite_expiry_hours: number
}

export interface Invitation {
  id: string
  email: string
  token: string
  status: 'pending' | 'accepted' | 'revoked'
  invited_by: string
  expires_at: string
  created_at: string
  used_at: string | null
}

export interface RevokeUserInput {
  userId: string
  action: 'ban' | 'unban'
}
