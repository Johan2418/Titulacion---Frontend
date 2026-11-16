import { useState } from 'react'
import { TriangleAlertIcon } from 'lucide-react'
import { Campo } from '@/components/Campo'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { TIPO_TEMA } from '@/lib/estados'
import { formatFechaHora } from '@/lib/fechas'
import { nombreCompleto } from '@/lib/utils'
import type { ConfirmacionPendiente } from '@/types/dominio'
import { useConfirmacionesPendientes, useResponderConfirmacion } from './api'
import { EstadoConfirmaciones } from './EstadoConfirmaciones'

const MAX_MOTIVO = 500

/** Evita que el diálogo se cierre con ESC o con un clic fuera: solo se sale respondiendo. */
const bloquear = (e: Event) => e.preventDefault()

function Respuesta({
  pendiente,
  total,
  onRespondida,
}: {
  pendiente: ConfirmacionPendiente
  total: number
  onRespondida: () => void
}) {
  const responder = useResponderConfirmacion()
  const [rechazando, setRechazando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const base = { postulacionId: pendiente.postulacionId }
  // ante un error (reserva vencida, ya respondida…) el aviso lo muestra la mutación y la lista
  // se vuelve a consultar para quitar lo que ya no espera respuesta
  const opciones = { onSuccess: onRespondida, onError: onRespondida }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {rechazando ? 'Rechazar el tema reservado' : 'Confirma el tema reservado'}
        </DialogTitle>
        <DialogDescription>
          {nombreCompleto(pendiente.representante)} reservó un tema
          {pendiente.grupo ? ` para el grupo «${pendiente.grupo.nombre}»` : ''}. Debes confirmarlo o
          rechazarlo antes del {formatFechaHora(pendiente.venceEn)}.
          {total > 1 && ` Tienes ${total} reservas por responder.`}
        </DialogDescription>
      </DialogHeader>
      <dl className="grid gap-x-3 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-muted-foreground">Tema</dt>
        <dd className="font-medium">{pendiente.tema.titulo}</dd>
        <dt className="text-muted-foreground">Tipo</dt>
        <dd>{TIPO_TEMA[pendiente.tema.tipo]?.label ?? pendiente.tema.tipo}</dd>
        {pendiente.grupo && (
          <>
            <dt className="text-muted-foreground">Grupo</dt>
            <dd>{pendiente.grupo.nombre}</dd>
          </>
        )}
        <dt className="text-muted-foreground">Representante</dt>
        <dd>{nombreCompleto(pendiente.representante)}</dd>
        <dt className="text-muted-foreground">Vence</dt>
        <dd>{formatFechaHora(pendiente.venceEn)}</dd>
      </dl>
      <div className="text-sm">
        <EstadoConfirmaciones confirmaciones={pendiente.confirmaciones} />
      </div>
      {rechazando ? (
        <>
          <Alert variant="destructive">
            <TriangleAlertIcon aria-hidden />
            <p className="col-start-2">
              Si rechazas, la postulación del grupo queda rechazada y el tema vuelve al banco de
              temas para otros estudiantes. El grupo no podrá volver a postular a este tema.
            </p>
          </Alert>
          <Campo etiqueta="Motivo (opcional)" ayuda={`Máximo ${MAX_MOTIVO} caracteres.`}>
            {(p) => (
              <Textarea
                {...p}
                value={motivo}
                maxLength={MAX_MOTIVO}
                onChange={(e) => setMotivo(e.target.value)}
              />
            )}
          </Campo>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={responder.isPending}
              onClick={() => setRechazando(false)}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              disabled={responder.isPending}
              onClick={() => responder.mutate({ ...base, accion: 'rechazar', motivo }, opciones)}
            >
              Rechazar tema
            </Button>
          </DialogFooter>
        </>
      ) : (
        <DialogFooter>
          <Button
            variant="outline"
            disabled={responder.isPending}
            onClick={() => setRechazando(true)}
          >
            Rechazar
          </Button>
          <Button
            disabled={responder.isPending}
            onClick={() => responder.mutate({ ...base, accion: 'confirmar' }, opciones)}
          >
            Confirmar tema
          </Button>
        </DialogFooter>
      )}
    </>
  )
}

/**
 * Bloque 3: al entrar, el estudiante debe responder cada reserva de tema pendiente de su
 * confirmación. El diálogo no se puede cerrar (sin «X», ESC ni clic fuera) hasta responder.
 */
export function ConfirmacionObligatoria() {
  const pendientes = useConfirmacionesPendientes()
  const lista = pendientes.data ?? []
  const actual = lista[0]
  if (!actual) return null
  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        ocultarCerrar
        onEscapeKeyDown={bloquear}
        onPointerDownOutside={bloquear}
        onInteractOutside={bloquear}
      >
        <Respuesta
          // un estado nuevo por reserva (vuelve a la vista de confirmar)
          key={actual.postulacionId}
          pendiente={actual}
          total={lista.length}
          onRespondida={() => void pendientes.refetch()}
        />
      </DialogContent>
    </Dialog>
  )
}
