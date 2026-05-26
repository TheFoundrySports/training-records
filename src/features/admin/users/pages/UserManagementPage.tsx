import { useUsers } from '../hooks/useUsers'
import { useUpdateUserRole } from '../hooks/useUpdateUserRole'

export function UserManagementPage() {
  const { data: users, isLoading } = useUsers()
  const { updateRole, isPending } = useUpdateUserRole()

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div role="status" aria-label="Loading users" className="space-y-3">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" aria-hidden="true" />
          {[1, 2].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" aria-hidden="true" />
          ))}
        </div>
      </div>
    )
  }

  const userList = users ?? []

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-6">User Management</h1>

      {userList.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users found.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {userList.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{user.email}</td>
                  <td className="px-4 py-3">
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={user.role}
                      disabled={isPending}
                      onChange={(e) =>
                        updateRole({ userId: user.id, role: e.target.value as 'admin' | 'athlete' })
                      }
                    >
                      <option value="admin">Admin</option>
                      <option value="athlete">Athlete</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}