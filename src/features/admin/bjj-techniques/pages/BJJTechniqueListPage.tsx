import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { useBJJTechniques } from '@/features/bjj/hooks/useBJJTechniques'
import { useDeleteBJJTechnique } from '../hooks/useBJJTechniqueMutations'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

export function BJJTechniqueListPage() {
  const navigate = useNavigate()
  const { data: techniques, isLoading } = useBJJTechniques()
  const deleteMutation = useDeleteBJJTechnique()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const techniqueToDelete = techniques?.find((t) => t.id === deleteId)

  async function handleConfirmDelete() {
    if (!deleteId) return
    await deleteMutation.mutateAsync(deleteId)
    setDeleteId(null)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div role="status" aria-label="Loading techniques" className="space-y-3">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" aria-hidden="true" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" aria-hidden="true" />
          ))}
        </div>
      </div>
    )
  }

  const list = techniques ?? []

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">BJJ Techniques</h1>
        <Button onClick={() => void navigate('/admin/bjj-techniques/new')}>Add Technique</Button>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No techniques yet. Add one above.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">YouTube</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((technique) => (
                <tr key={technique.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{technique.name}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">
                    {technique.category ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {technique.youtubeUrl ? (
                      <span className="inline-flex items-center gap-1 text-primary text-xs">
                        ✓ Yes
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <Link
                      to={`/admin/bjj-techniques/${technique.id}/edit`}
                      className="text-primary hover:underline text-sm"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteId(technique.id)}
                      className="text-destructive hover:underline text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete technique</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{techniqueToDelete?.name}&rdquo;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleConfirmDelete()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
