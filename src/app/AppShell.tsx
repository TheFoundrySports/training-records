import { Link, Outlet } from 'react-router'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

export function AppShell() {
  const { user } = useAuth()

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              to="/workouts"
              className="font-semibold text-lg tracking-tight"
            >
              Training Records
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm">
              <Link
                to="/workouts"
                className="text-foreground/60 transition-colors hover:text-foreground"
              >
                Workouts
              </Link>
              <Link
                to="/ai"
                className="text-foreground/60 transition-colors hover:text-foreground"
              >
                AI Generate
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden sm:block text-sm text-muted-foreground">
                {user.email}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleLogout()}
            >
              Sign out
            </Button>
          </div>
        </div>
        <Separator />
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
