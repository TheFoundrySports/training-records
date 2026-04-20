import { useNavigate } from 'react-router'

export function WorkoutTypePicker() {
  const navigate = useNavigate()

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Log Workout</h1>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => void navigate('/workouts/new/crossfit')}
          className="rounded-xl border p-6 text-left hover:border-primary transition-colors"
        >
          <p className="text-lg font-medium">CrossFit / Functional</p>
          <p className="text-sm text-muted-foreground mt-1">WOD-based training</p>
        </button>
        <button
          onClick={() => void navigate('/bjj/new')}
          className="rounded-xl border p-6 text-left hover:border-primary transition-colors"
        >
          <p className="text-lg font-medium">Brazilian Jiu-Jitsu</p>
          <p className="text-sm text-muted-foreground mt-1">Section-based technique training</p>
        </button>
      </div>
    </div>
  )
}
