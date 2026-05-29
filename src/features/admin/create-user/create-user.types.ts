export interface CreateUserInput {
  email: string
}

export interface CreateInviteInput {
  email: string
}

export interface InviteResult {
  success: boolean
  invite_url: string
  expires_at: string
  token?: string
}
