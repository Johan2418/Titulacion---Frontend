import { StatusBadge } from '@/components/StatusBadge'
import { ESTADO_CONFIRMACION } from '@/lib/estados'
import { formatFechaHora } from '@/lib/fechas'
import { nombreCompleto } from '@/lib/utils'
import type { ConfirmacionIntegrante, ISODate } from '@/types/dominio'

/**
 * Bloque 3: respuesta de cada integrante a la reserva del tema. Las postulaciones anteriores a la
 * confirmación obligatoria no traen confirmaciones y no muestran nada.
 */
export function EstadoConfirmaciones({
  confirmaciones,
  venceEn,
}: {
  confirmaciones: ConfirmacionIntegrante[] | undefined
  venceEn?: ISODate | null
}) {
  if (!confirmaciones?.length) return null
  const confirmadas = confirmaciones.filter((c) => c.estado === 'CONFIRMADA').length
  return (
    <div>
      <p className="mb-1 font-medium">
        Confirmación de integrantes ({confirmadas} de {confirmaciones.length})
      </p>
      {venceEn && (
        <p className="mb-1 text-xs text-muted-foreground">
          La reserva vence el {formatFechaHora(venceEn)} si no confirman todos.
        </p>
      )}
      <ul className="space-y-1" aria-label="Confirmación de integrantes">
        {confirmaciones.map((c) => (
          <li key={c.estudianteId} className="flex flex-wrap items-center gap-2">
            <span>{nombreCompleto(c)}</span>
            <StatusBadge mapa={ESTADO_CONFIRMACION} valor={c.estado} />
            {c.respondidaEn && (
              <span className="text-xs text-muted-foreground">
                {formatFechaHora(c.respondidaEn)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
