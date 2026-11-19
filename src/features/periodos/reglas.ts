import type { PeriodoTitulacion } from '@/types/dominio'

/**
 * The period faculty can change only in BORRADOR and while the period has no enabled students
 * (the same rule the backend enforces). Topics live in the career bank, so they do not lock it.
 */
export function facultadBloqueada(enBorrador: boolean, estudiantesHabilitados: number | undefined) {
  return !enBorrador || (estudiantesHabilitados ?? 0) > 0
}

/** Transiciones manuales que el backend permite forzar (`{ forzar: true, motivo }`). */
export type TransicionPeriodo = 'abrir' | 'cerrar' | 'iniciar'

export type CampoFechaPeriodo =
  'fechaInicioPostulacion' | 'fechaFinPostulacion' | 'fechaInicioTitulacion'

export type EvaluacionTransicion =
  /** La fecha ya se alcanzó: transición normal. */
  | { tipo: 'normal' }
  /** La fecha aún no llega: se puede forzar moviendo `campo` a la hora actual. */
  | { tipo: 'forzable'; campo: CampoFechaPeriodo }
  /** Ni la transición normal ni la forzada son posibles; `motivo` explica qué corregir. */
  | { tipo: 'bloqueada'; motivo: string }

type FechasPeriodo = Pick<
  PeriodoTitulacion,
  'fechaInicioPostulacion' | 'fechaFinPostulacion' | 'fechaInicioTitulacion'
>

/**
 * Replica las guardas de fecha del backend (diseño de bloques 2-3-4) para decidir si el botón
 * ejecuta la transición normal o abre la advertencia de transición forzada. El backend vuelve a
 * validar con el reloj de PostgreSQL, así que esta evaluación solo orienta la interfaz.
 */
export function evaluarTransicion(
  transicion: TransicionPeriodo,
  periodo: FechasPeriodo,
  ahora: Date = new Date(),
): EvaluacionTransicion {
  const t = ahora.getTime()
  const inicio = new Date(periodo.fechaInicioPostulacion).getTime()
  const fin = new Date(periodo.fechaFinPostulacion).getTime()
  const titulacion = new Date(periodo.fechaInicioTitulacion).getTime()
  if (transicion === 'abrir') {
    if (t >= fin)
      return {
        tipo: 'bloqueada',
        motivo:
          'La fecha fin de postulación ya pasó. Edite primero la fecha fin de postulación para poder abrirla.',
      }
    return t < inicio ? { tipo: 'forzable', campo: 'fechaInicioPostulacion' } : { tipo: 'normal' }
  }
  if (transicion === 'cerrar') {
    if (t >= fin) return { tipo: 'normal' }
    if (t <= inicio)
      return {
        tipo: 'bloqueada',
        motivo: 'La fecha de inicio de postulación aún no llega; no se puede forzar el cierre.',
      }
    return { tipo: 'forzable', campo: 'fechaFinPostulacion' }
  }
  if (t >= titulacion) return { tipo: 'normal' }
  if (t < fin)
    return {
      tipo: 'bloqueada',
      motivo: 'No se puede forzar el inicio: el plazo de postulación aún no vence.',
    }
  return { tipo: 'forzable', campo: 'fechaInicioTitulacion' }
}

/** Las transiciones forzadas se auditan como `*_FORZADA` con el motivo en los valores nuevos. */
export const esAccionForzada = (accion: string) => accion.endsWith('_FORZADA')
