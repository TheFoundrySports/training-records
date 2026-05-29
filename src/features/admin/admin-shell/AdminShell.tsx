import { NavLink, Outlet } from 'react-router'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'

const NAV_ITEMS = [
  { label: 'BJJ Techniques', to: '/admin/bjj-techniques' },
  { label: 'AI Settings', to: '/admin/ai-settings' },
  { label: 'Thresholds', to: '/admin/technique-thresholds' },
  { label: 'Users', to: '/admin/users' },
  { label: 'Create User', to: '/admin/create-user' },
  { label: 'Registration Settings', to: '/admin/registration-settings' },
]

export function AdminShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar — full width, visible above lg */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r bg-muted/30">
        <nav className="flex flex-col gap-1 p-4">
          {NAV_ITEMS.map((item) => {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }: { isActive: boolean }) =>
                  `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`
                }
              >
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen">
        {/* Mobile hamburger — visible below lg */}
        <div className="lg:hidden sticky top-0 z-40 flex items-center gap-4 p-4 border-b bg-background/95 backdrop-blur">
          <Button
            aria-label="Open admin navigation"
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <span className="font-semibold">Admin</span>
        </div>

        <Outlet />
      </main>

      {/* Mobile Sidebar Drawer */}
      <DialogPrimitive.Root open={sidebarOpen} onOpenChange={(open) => {
        setSidebarOpen(open)
        document.body.style.overflow = open ? 'hidden' : ''
      }}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 bg-black/50 z-50" />
          <DialogPrimitive.Popup className="fixed inset-y-0 left-0 w-72 bg-background z-50 shadow-xl flex flex-col outline-none">
            <div className="flex items-center justify-between p-4 border-b">
              <span className="font-semibold text-foreground">Admin</span>
              <Button
                aria-label="Close admin navigation"
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="flex flex-col gap-1 p-4">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }: { isActive: boolean }) =>
                    `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                    }`
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  )
}