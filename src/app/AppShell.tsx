import { Link, Outlet } from 'react-router'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import { usePageFocus } from '@/hooks/usePageFocus'

export function AppShell() {
  const { user } = useAuth()
  usePageFocus()

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/workouts" className="font-semibold text-lg tracking-tight">
              Training Records
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm">
              <Link
                to="/workouts"
                className="text-foreground/60 transition-colors hover:text-foreground"
              >
                Workouts
              </Link>
              <Link to="/ai" className="text-foreground/60 transition-colors hover:text-foreground">
                AI Generate
              </Link>
              <Link
                to="/calendar"
                className="text-foreground/60 transition-colors hover:text-foreground"
              >
                Calendar
              </Link>
              <Link
                to="/bjj/blue-belt-progression"
                className="text-foreground/60 transition-colors hover:text-foreground"
              >
                Blue Belt
              </Link>
              <Link
                to="/admin/bjj-techniques"
                className="text-foreground/60 transition-colors hover:text-foreground"
              >
                BJJ Techniques
              </Link>
              <Link
                to="/admin/ai-settings"
                className="text-foreground/60 transition-colors hover:text-foreground"
              >
                AI Settings
              </Link>
              <Link
                to="/admin/technique-thresholds"
                className="text-foreground/60 transition-colors hover:text-foreground"
              >
                Thresholds
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden sm:block text-sm text-muted-foreground">{user.email}</span>
            )}
            <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>
              Sign out
            </Button>
          </div>
        </div>
        <Separator />
      </header>
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
    </div>
  )
}
