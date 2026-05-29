import { Link, Outlet } from 'react-router'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import { usePageFocus } from '@/hooks/usePageFocus'

const NAV_ITEMS = [
  { label: 'Workouts', to: '/workouts' },
  { label: 'AI Generate', to: '/ai' },
  { label: 'Calendar', to: '/calendar' },
  { label: 'Blue Belt', to: '/bjj/blue-belt-progression' },
]

export function AppShell() {
  const { user, role } = useAuth()
  usePageFocus()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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
              {role === 'admin' && (
                <Link
                  to="/admin/bjj-techniques"
                  className="text-foreground/60 transition-colors hover:text-foreground"
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden sm:block text-sm text-muted-foreground">{user.email}</span>
            )}
            <Button
              aria-label="Open navigation menu"
              variant="ghost"
              size="icon"
              className="flex md:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>
              Sign out
            </Button>
          </div>
        </div>
        <Separator />
      </header>

      {/* Mobile Navigation Drawer */}
      <DialogPrimitive.Root open={mobileNavOpen} onOpenChange={(open) => {
        setMobileNavOpen(open)
        document.body.style.overflow = open ? 'hidden' : ''
      }}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 bg-black/50 z-50" />
          <DialogPrimitive.Popup className="fixed inset-y-0 left-0 w-72 bg-background z-50 shadow-xl flex flex-col outline-none">
            <div className="flex items-center justify-between p-4 border-b">
              <span className="font-semibold text-foreground">Menu</span>
              <Button
                aria-label="Close navigation menu"
                variant="ghost"
                size="icon"
                onClick={() => setMobileNavOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="flex flex-col gap-1 p-4">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="px-3 py-2 rounded-md text-sm font-medium text-foreground/70 hover:bg-muted hover:text-foreground transition-colors"
                  onClick={() => setMobileNavOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              {role === 'admin' && (
                <Link
                  to="/admin/bjj-techniques"
                  className="px-3 py-2 rounded-md text-sm font-medium text-foreground/70 hover:bg-muted hover:text-foreground transition-colors"
                  onClick={() => setMobileNavOpen(false)}
                >
                  Admin
                </Link>
              )}
            </nav>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
    </div>
  )
}
