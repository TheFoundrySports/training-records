import { useNavigate, Link } from 'react-router'
import { useExercises } from '../hooks/useExercises'
import { Button } from '@/components/ui/button'

export function ExerciseListPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useExercises({})

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div role="status" aria-label="Loading exercises" className="space-y-3">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" aria-hidden="true" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" aria-hidden="true" />
          ))}
        </div>
      </div>
    )
  }

  const exercises = data?.data ?? []

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Exercises</h1>
        <Button onClick={() => void navigate('/exercises/new')}>Add Exercise</Button>
      </div>

      {exercises.length === 0 ? (
        <p className="text-sm text-muted-foreground">No exercises yet. Add one above.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Movement Type</th>
                <th className="px-4 py-3 text-left font-medium">Difficulty</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {exercises.map((exercise) => (
                <tr key={exercise.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{exercise.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{exercise.movementType}</td>
                  <td className="px-4 py-3 text-muted-foreground">{exercise.difficultyLevel}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/exercises/${exercise.id}/edit`}
                      className="text-primary hover:underline text-sm"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>
        </div>
      )}
    </div>
  )
}
