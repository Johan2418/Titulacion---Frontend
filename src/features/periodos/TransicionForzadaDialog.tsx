import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { ESTADO_PERIODO } from '@/lib/estados'
import { mensajeError } from '@/lib/errores'
import { formatFechaHora } from '@/lib/fechas'
import type { EstadoPeriodo, PeriodoTitulacion } from '@/types/dominio'
import { useTransicionForzada } from './api'
import type { CampoFechaPeriodo, TransicionPeriodo } from './reglas'
import { transicionForzadaSchema, type TransicionForzadaForm } from './schemas'

const NOMBRE_CAMPO: Record<CampoFechaPeriodo, string> = {
  fechaInicioPostulacion: 'fecha de inicio de postulación',
  fechaFinPostulacion: 'fecha fin de postulación',
  fechaInicioTitulacion: 'fecha de inicio de titulación',
}

const DESTINO: Record<TransicionPeriodo, EstadoPeriodo> = {
  abrir: 'POSTULACION_ABIERTA',
  cerrar: 'POSTULACION_CERRADA',
  iniciar: 'EN_CURSO',
}

/** Consecuencias que el administrador debe conocer antes de forzar cada transición. */
function consecuencias(transicion: TransicionPeriodo, periodo: PeriodoTitulacion): string[] {
  if (transicion === 'abrir')
    return [
      `Los estudiantes podrán postular desde ahora hasta el ${formatFechaHora(periodo.fechaFinPostulacion)}.`,
    ]
  if (transicion === 'cerrar')
    return [
      'Ningún estudiante podrá postular desde ahora.',
      'Las reservas de temas que aún esperan la confirmación de los integrantes vencerán y esos temas volverán a estar disponibles.',
    ]
  const pendientes = periodo.condicionadosPendientes ?? 0
  return [
    `El período pasará a «${ESTADO_PERIODO.EN_CURSO.label}».`,
    ...(pendientes > 0
      ? [
          `Los ${pendientes} estudiante(s) condicionado(s) sin resolver quedarán suspendidos y no admitidos.`,
        ]
      : []),
  ]
}

/**
 * Bloque 2: la fecha de la transición aún no llega. Se advierte qué fecha pasará a la hora
 * actual y se exige un motivo (10–500 caracteres) que el backend guarda en la auditoría.
 */
export function TransicionForzadaDialog({
  periodo,
  transicion,
  campo,
  etiqueta,
}: {
  periodo: PeriodoTitulacion
  transicion: TransicionPeriodo
  campo: CampoFechaPeriodo
  etiqueta: string
}) {
  const [abierto, setAbierto] = useState(false)
  const forzar = useTransicionForzada()
  const { register, handleSubmit, formState, reset } = useForm<TransicionForzadaForm>({
    resolver: zodResolver(transicionForzadaSchema),
    defaultValues: { motivo: '' },
  })
  const cambiarAbierto = (v: boolean) => {
    setAbierto(v)
    if (!v) {
      reset()
      forzar.reset()
    }
  }
  const enviar = handleSubmit(({ motivo }) =>
    forzar.mutate(
      { id: periodo.id, estado: DESTINO[transicion], motivo },
      { onSuccess: () => cambiarAbierto(false) },
    ),
  )
  const nombreCampo = NOMBRE_CAMPO[campo]

  return (
    <Dialog open={abierto} onOpenChange={cambiarAbierto}>
      <Button variant="outline" size="sm" onClick={() => setAbierto(true)}>
        {etiqueta}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Forzar «{etiqueta.toLowerCase()}»: {periodo.codigo}
          </DialogTitle>
          <DialogDescription>
            La {nombreCampo} ({formatFechaHora(periodo[campo])}) todavía no se alcanza.
          </DialogDescription>
        </DialogHeader>
        <Alert variant="destructive">
          <TriangleAlertIcon aria-hidden />
          <div className="col-start-2 space-y-1">
            <p className="font-medium">
              Si continúa, la {nombreCampo} se moverá a la fecha y hora actuales.
            </p>
            <ul className="list-disc space-y-0.5 pl-4">
              {consecuencias(transicion, periodo).map((c) => (
                <li key={c}>{c}</li>
              ))}
              <li>La acción queda registrada en el historial con el motivo indicado.</li>
            </ul>
          </div>
        </Alert>
        <form onSubmit={enviar} noValidate className="space-y-4">
          <Campo
            etiqueta="Motivo"
            requerido
            error={formState.errors.motivo?.message}
            ayuda="Entre 10 y 500 caracteres."
          >
            {(p) => <Textarea {...p} maxLength={500} {...register('motivo')} />}
          </Campo>
          {forzar.error && (
            <Alert variant="destructive">
              <p className="col-start-2">{mensajeError(forzar.error)}</p>
            </Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => cambiarAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={forzar.isPending}>
              Forzar y {etiqueta.toLowerCase()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
