import { useState, type ReactNode } from 'react'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'

export function ConfirmDialog({
  trigger,
  titulo,
  descripcion,
  confirmar = 'Confirmar',
  destructivo,
  onConfirm,
  children,
}: {
  trigger: ReactNode
  titulo: string
  descripcion?: ReactNode
  confirmar?: string
  destructivo?: boolean
  onConfirm: () => Promise<unknown> | void
  children?: ReactNode
}) {
  const [abierto, setAbierto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button
            variant={destructivo ? 'destructive' : 'default'}
            disabled={enviando}
            onClick={async () => {
              setEnviando(true)
              try {
                await onConfirm()
                setAbierto(false)
              } catch {
                // el error se notifica desde la mutación
              } finally {
                setEnviando(false)
              }
            }}
          >
            {confirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
