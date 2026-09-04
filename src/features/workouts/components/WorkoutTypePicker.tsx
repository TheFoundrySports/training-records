import { useNavigate } from 'react-router'
import { Dumbbell, Shield, type LucideIcon } from 'lucide-react'

/** Option on the /workouts/new hero picker. Adding one is a constant-entry change. */
interface WorkoutTypeOption {
  readonly id: 'crossfit' | 'bjj'
  readonly title: string
  readonly subtitle: string
  readonly href: string
  readonly icon: LucideIcon
}

// eslint-disable-next-line react-refresh/only-export-components
export const WORKOUT_TYPE_OPTIONS: readonly WorkoutTypeOption[] = [
  {
    id: 'crossfit',
    title: 'CrossFit / Functional',
    subtitle: 'WOD-based training',
    href: '/workouts/new/crossfit',
    icon: Dumbbell,
  },
  {
    id: 'bjj',
    title: 'Brazilian Jiu-Jitsu',
    subtitle: 'Section-based technique training',
    href: '/bjj/new',
    icon: Shield,
  },
]

export function WorkoutTypePicker() {
  const navigate = useNavigate()
  return (
    <div className="container mx-auto px-4 py-8 sm:py-12 max-w-2xl sm:max-w-3xl">
      <h1 className="text-2xl font-semibold mb-6">Log Workout</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {WORKOUT_TYPE_OPTIONS.map(({ id, title, subtitle, href, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => void navigate(href)}
            className="group rounded-xl border bg-card p-6 sm:p-8 text-left min-h-40 sm:min-h-48 flex flex-col gap-3 cursor-pointer transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]"
          >
            <Icon className="size-8 sm:size-10 text-primary shrink-0" aria-hidden="true" />
            <p className="text-lg sm:text-xl font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
