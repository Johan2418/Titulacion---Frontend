import { Campo } from '@/components/Campo'
import { Input } from '@/components/ui/input'
import { CLAVE_MAX, CLAVE_MIN } from './clave'

/** Nueva contraseña y su confirmación, con las reglas del backend. */
export function CamposNuevaClave({
  clave,
  confirmacion,
  setClave,
  setConfirmacion,
}: {
  clave: string
  confirmacion: string
  setClave: (v: string) => void
  setConfirmacion: (v: string) => void
}) {
  return (
    <>
      <Campo
        etiqueta="Nueva contraseña"
        requerido
        ayuda={`Entre ${CLAVE_MIN} y ${CLAVE_MAX} caracteres.`}
      >
        {(p) => (
          <Input
            {...p}
            type="password"
            autoComplete="new-password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required
          />
        )}
      </Campo>
      <Campo etiqueta="Confirmar contraseña" requerido>
        {(p) => (
          <Input
            {...p}
            type="password"
            autoComplete="new-password"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            required
          />
        )}
      </Campo>
    </>
  )
}
