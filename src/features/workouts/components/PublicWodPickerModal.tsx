import { useState, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent, TextField } from '@mui/material'
import { usePublicWods } from '@/features/public-wods'
import type { PublicWodFormFields } from '@/features/public-wods'
import type { PublicWod } from '@/features/public-wods'

interface PublicWodPickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (fields: PublicWodFormFields) => void
}

function wodToFormFields(wod: PublicWod): PublicWodFormFields {
  return {
    title: wod.title,
    type: wod.type,
    wodFormat: wod.wodFormat,
    wodText: wod.wodText,
    payload: wod.payload,
    durationMinutes: wod.durationMinutes,
  }
}

export function PublicWodPickerModal({ open, onOpenChange, onSelect }: PublicWodPickerModalProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const {
    data: wods,
    isLoading,
    isError,
  } = usePublicWods(debouncedSearch ? { q: debouncedSearch } : undefined)

  function handleSelect(wod: PublicWod) {
    onSelect(wodToFormFields(wod))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)} maxWidth="sm" fullWidth>
      <DialogTitle
        style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 500 }}
      >
        Load a Public WOD
      </DialogTitle>
      <DialogContent
        dividers
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
      >
        <TextField
          size="small"
          placeholder="Search workouts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          fullWidth
        />

        <div
          style={{
            maxHeight: 360,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          {isLoading && (
            <p
              style={{
                textAlign: 'center',
                padding: 'var(--space-8)',
                color: 'var(--muted)',
                fontSize: 'var(--text-sm)',
              }}
            >
              Loading…
            </p>
          )}
          {isError && (
            <p
              style={{
                textAlign: 'center',
                padding: 'var(--space-8)',
                color: 'var(--danger)',
                fontSize: 'var(--text-sm)',
              }}
            >
              Failed to load workouts. Try again.
            </p>
          )}
          {!isLoading && !isError && wods?.length === 0 && (
            <p
              style={{
                textAlign: 'center',
                padding: 'var(--space-8)',
                color: 'var(--muted)',
                fontSize: 'var(--text-sm)',
              }}
            >
              No workouts found.
            </p>
          )}
          {!isLoading &&
            !isError &&
            wods?.map((wod) => (
              <button
                key={wod.id}
                type="button"
                onClick={() => handleSelect(wod)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-warm)',
                  border: '1px solid var(--border-soft)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background var(--motion-fast) var(--ease-standard)',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-warm)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-2)',
                  }}
                >
                  <span
                    style={{
                      fontWeight: 500,
                      fontSize: 'var(--text-sm)',
                      color: 'var(--fg)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {wod.title}
                  </span>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {wod.category && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-pill)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          background: 'var(--surface)',
                          color: 'var(--accent)',
                        }}
                      >
                        {wod.category}
                      </span>
                    )}
                    {wod.wodFormat && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-pill)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--muted)',
                        }}
                      >
                        {wod.wodFormat}
                      </span>
                    )}
                  </div>
                </div>
                {wod.durationMinutes && (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
                    {wod.durationMinutes} min
                  </p>
                )}
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
