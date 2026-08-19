import {
  Controller,
  type Control,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'

interface MatFormFieldProps<
  T extends FieldValues,
  TName extends FieldPath<T> = FieldPath<T>,
> {
  control: Control<T>
  name: TName
  label: string
  hint?: string
  required?: boolean
  disabled?: boolean
  className?: string
  render: (props: {
    id: string
    'aria-invalid': boolean
    'aria-required'?: boolean
    'aria-describedby'?: string
    disabled?: boolean
    field: ControllerRenderProps<T, TName>
  }) => React.ReactNode
}

function FieldErrorIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="8" cy="8" r="6.4" />
      <path d="M8 5v3.5M8 10.5h0" strokeLinecap="round" />
    </svg>
  )
}

export function MatFormField<
  T extends FieldValues,
  TName extends FieldPath<T>,
>({
  control,
  name,
  label,
  hint,
  required,
  disabled,
  className,
  render,
}: MatFormFieldProps<T, TName>) {
  const fieldId = String(name).replace(/\./g, '-')
  const hintId = `${fieldId}-hint`
  const errorId = `${fieldId}-error`

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const hasError = Boolean(fieldState.error)
        const describedBy = hasError ? errorId : hint ? hintId : undefined

        return (
          <div className={className ? `field ${className}` : 'field'}>
            <label className="label" htmlFor={fieldId}>
              {label}
              {required ? (
                <span className="req" aria-hidden="true">
                  {' '}
                  *
                </span>
              ) : null}
            </label>
            {render({
              id: fieldId,
              'aria-invalid': hasError,
              'aria-required': required,
              'aria-describedby': describedBy,
              disabled,
              field,
            })}
            {hasError && fieldState.error?.message ? (
              <p id={errorId} className="field-error" role="alert">
                <FieldErrorIcon />
                <span>{fieldState.error.message}</span>
              </p>
            ) : hint ? (
              <p id={hintId} className="hint">
                {hint}
              </p>
            ) : null}
          </div>
        )
      }}
    />
  )
}
