import { Navigate, Outlet } from 'react-router'
import { useAuth } from './AuthContext'

export function ProtectedRoute() {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <h1 className="sr-only">Loading</h1>
        <div
          role="status"
          aria-label="Loading"
          className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"
        />
      </main>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
