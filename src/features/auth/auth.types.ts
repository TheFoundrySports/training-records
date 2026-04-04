export type UserRole = 'athlete' | 'admin'

export interface UserProfile {
  id: string
  role: UserRole
}
