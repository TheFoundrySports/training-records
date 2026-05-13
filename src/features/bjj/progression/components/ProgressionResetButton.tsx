"use client"

import { useState } from 'react'
import { RotateCcwIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ProgressionResetButtonProps {
  onReset: () => void
  isPending: boolean
}

function ProgressionResetButton({ onReset, isPending }: ProgressionResetButtonProps) {
  const [open, setOpen] = useState(false)

  const handleConfirm = () => {
    onReset()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={isPending}
        className="gap-1.5"
      >
        <RotateCcwIcon className="size-3.5" />
        Reiniciar Progreso
      </Button>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>¿Reiniciar progreso?</DialogTitle>
          <DialogDescription>
            Se borrarán todas las marcas de los 45 requisitos. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? 'Reiniciando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { ProgressionResetButton }