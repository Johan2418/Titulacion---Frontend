import { useState, type FormEvent } from 'react'
import { KeyRoundIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthProvider'
import { CamposNuevaClave } from '@/auth/CamposNuevaClave'
import { validarClave } from '@/auth/clave'
import { Campo } from '@/components/Campo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { mensajeError } from '@/lib/errores'

/** Cambio de contraseña de la cuenta con sesión iniciada (POST /auth/change-password). */
export function CambiarClaveDialog({
  abierto,
  onClose,
}: {
  abierto: boolean
  onClose: () => void
}) {
  const { cambiarClave } = useAuth()
  const [actual, setActual] = useState('')
  const [clave, setClave] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const cerrar = () => {
    setActual('')
    setClave('')
    setConfirmacion('')
    setError(null)
    onClose()
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const invalida = !actual ? 'Ingrese su contraseña actual.' : validarClave(clave, confirmacion)
    if (invalida) return setError(invalida)
    if (clave === actual) return setError('La nueva contraseña debe ser distinta de la actual.')
    setEnviando(true)
    setError(null)
    try {
      await cambiarClave(actual, clave)
      toast.success('Contraseña actualizada. Las demás sesiones abiertas se cerraron.')
      cerrar()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>
            Al guardar se cerrarán las sesiones abiertas en otros dispositivos.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)} noValidate>
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Campo etiqueta="Contraseña actual" requerido>
            {(p) => (
              <Input
                {...p}
                type="password"
                autoComplete="current-password"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                required
              />
            )}
          </Campo>
          <CamposNuevaClave {...{ clave, confirmacion, setClave, setConfirmacion }} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cerrar}>
              Cancelar
            </Button>
            <Button disabled={enviando}>
              <KeyRoundIcon /> {enviando ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
