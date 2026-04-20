import { Navigate } from 'react-router'
import { useAuth } from './AuthContext'

interface AdminRouteProps {
  children: React.ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { role, isLoading } = useAuth()

  if (isLoading) return null

  if (role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
