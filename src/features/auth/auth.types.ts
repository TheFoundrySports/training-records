export type UserRole = 'athlete' | 'admin'

export interface UserProfile {
  id: string
  role: UserRole
}

export interface RegisterInput {
  email: string
  password: string
  token?: string
}

export interface AcceptInviteInput {
  token: string
  password: string
}

export interface RegisterResponse {
  success: boolean
  user_id?: string
  error?: string
}

export interface AcceptInviteResponse {
  success: boolean
  user_id?: string
  error?: string
  warning?: string
}
