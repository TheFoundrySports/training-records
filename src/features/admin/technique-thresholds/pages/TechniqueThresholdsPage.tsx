import { useTechniqueThresholds } from '../hooks/useTechniqueThresholds'
import { ThresholdRow } from '../components/ThresholdRow'

const SKELETON_ROWS = 6

export function TechniqueThresholdsPage() {
  const { data: techniques, isLoading } = useTechniqueThresholds()

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div role="status" aria-label="Loading techniques" className="space-y-3">
          <div className="h-8 w-64 rounded bg-muted animate-pulse" aria-hidden="true" />
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" aria-hidden="true" />
          ))}
        </div>
      </div>
    )
  }

  const list = techniques ?? []

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-6">Technique Thresholds</h1>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No techniques found.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table aria-label="Technique thresholds" className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Threshold</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((technique) => (
                <ThresholdRow key={technique.techniqueId} technique={technique} />
              ))}
            </tbody>
          </table>
            </div>
        </div>
      )}
    </div>
  )
}