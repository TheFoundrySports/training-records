import type { FormStep } from './useBJJFormProgress'
import { scrollToFormSection } from './useBJJFormProgress'

interface BJJFormStepperProps {
  steps: FormStep[]
}

export function BJJFormStepper({ steps }: BJJFormStepperProps) {
  return (
    <ol className="stepper" aria-label="Registration progress">
      {steps.map((step, index) => (
        <li key={step.id} className="step" data-state={step.state}>
          <div className="step-bar" />
          <button
            type="button"
            className="step-btn"
            onClick={() => scrollToFormSection(step.targetId)}
          >
            <span className="step-idx" aria-hidden="true">
              {index + 1}
            </span>
            <span className="step-name">{step.name}</span>
            <span className="sr-only">
              Step {index + 1} of {steps.length}: {step.name}
            </span>
          </button>
        </li>
      ))}
    </ol>
  )
}
