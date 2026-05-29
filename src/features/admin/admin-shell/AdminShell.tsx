import { NavLink, Outlet } from 'react-router'

const NAV_ITEMS = [
  { label: 'BJJ Techniques', to: '/admin/bjj-techniques' },
  { label: 'AI Settings', to: '/admin/ai-settings' },
  { label: 'Thresholds', to: '/admin/technique-thresholds' },
  { label: 'Users', to: '/admin/users' },
  { label: 'Create User', to: '/admin/create-user' },
  { label: 'Registration Settings', to: '/admin/registration-settings' },
]

export function AdminShell() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-muted/30 shrink-0">
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
        <Outlet />
      </main>
    </div>
  )
}