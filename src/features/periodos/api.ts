import { useQuery } from '@tanstack/react-query'
import { api, noDisponible } from '@/api/client'
import { K } from '@/api/claves'
import { useMutacion } from '@/api/mutacion'
import type {
  EstadoPeriodo,
  EstadoPostulacion,
  EstadoTema,
  PeriodoTitulacion,
  ResumenPeriodo,
} from '@/types/dominio'

export type PeriodoInput = Pick<
  PeriodoTitulacion,
  | 'codigo'
  | 'nombre'
  | 'facultadId'
  | 'fechaInicioPostulacion'
  | 'fechaFinPostulacion'
  | 'fechaInicioTitulacion'
  | 'maxIntegrantesDefault'
>

/** Orden de preferencia para elegir el período vigente. */
export const PRIORIDAD_PERIODO: EstadoPeriodo[] = [
  'POSTULACION_ABIERTA',
  'POSTULACION_CERRADA',
  'EN_CURSO',
  'BORRADOR',
  'ARCHIVADO',
]

export const periodoVigente = (periodos: PeriodoTitulacion[]) =>
  [...periodos].sort(
    (a, b) => PRIORIDAD_PERIODO.indexOf(a.estado) - PRIORIDAD_PERIODO.indexOf(b.estado),
  )[0] ?? null

const listarPeriodos = () => api.todas<PeriodoTitulacion>('/periodos')

/** `enabled=false` para roles sin acceso a GET /periodos (COORDINADOR responde 403). */
export const usePeriodos = (enabled = true) =>
  useQuery({ queryKey: K.periodos, queryFn: listarPeriodos, enabled })

export const usePeriodoActual = () =>
  useQuery({
    queryKey: K.periodoActual,
    queryFn: async () => periodoVigente(await listarPeriodos()),
  })

/** GET /periodos/:id/resumen (ADMIN): indicadores agregados del panel en una sola consulta. */
interface ResumenPeriodoB {
  estudiantesHabilitados: number
  condicionadosPendientes: number
  temasPorEstado: Record<EstadoTema, number>
  postulacionesPorEstado: Record<EstadoPostulacion, number>
  conflictosAbiertos: number
  asignacionesVigentes: number
  sinTutor: number
  patPorRevisar: number
}

const resumenPeriodo = async (pid: string): Promise<ResumenPeriodo> => {
  const r = await api.get<ResumenPeriodoB>(`/periodos/${pid}/resumen`)
  return {
    estudiantesHabilitados: r.estudiantesHabilitados,
    condicionadosPendientes: r.condicionadosPendientes,
    temasPorEstado: r.temasPorEstado,
    postulacionesPorEstado: r.postulacionesPorEstado,
    conflictosAbiertos: r.conflictosAbiertos,
    asignacionesVigentes: r.asignacionesVigentes,
    sinTutor: r.sinTutor,
    patPorRevisar: r.patPorRevisar,
  }
}

export const useResumenPeriodo = (pid?: string) =>
  useQuery({
    queryKey: K.resumen(pid ?? ''),
    queryFn: () => resumenPeriodo(pid!),
    enabled: !!pid,
  })

export const useCrearPeriodo = () =>
  useMutacion({
    fn: (b: PeriodoInput) => api.post<PeriodoTitulacion>('/periodos', b),
    invalida: [K.periodos],
    exito: 'Período creado.',
  })

export const useActualizarPeriodo = () =>
  useMutacion({
    fn: ({ id, ...b }: Partial<PeriodoInput> & { id: string }) =>
      api.patch<PeriodoTitulacion>(`/periodos/${id}`, b),
    invalida: [K.periodos],
    exito: 'Período actualizado.',
  })

export const useConfigurarSedePat = () =>
  useMutacion({
    fn: ({ id, extension }: { id: string; extension: string }) =>
      api.patch(`/periodos/${id}/datos-formato-pat`, { extension }),
    invalida: [K.periodos],
    exito: 'Sede del PAT configurada.',
  })

/** El backend expone una acción por cada transición del período. */
const ACCION_ESTADO: Partial<Record<EstadoPeriodo, string>> = {
  POSTULACION_ABIERTA: 'abrir-postulacion',
  POSTULACION_CERRADA: 'cerrar-postulacion',
  EN_CURSO: 'iniciar-titulacion',
  ARCHIVADO: 'archivar',
}

export interface CambioEstadoPeriodo {
  id: string
  estado: EstadoPeriodo
  /** Archivar lo exige; en una transición forzada es obligatorio (10–500 caracteres). */
  motivo?: string
  /** Mueve a la hora actual la fecha que aún no se alcanza (transición forzada). */
  forzar?: boolean
}

/** Cuerpo de la acción: archivar lleva motivo; forzar, `{ forzar, motivo }`; el resto, vacío. */
export const cuerpoCambioEstado = ({ estado, motivo, forzar }: CambioEstadoPeriodo) => {
  if (estado === 'ARCHIVADO') return { motivo }
  if (forzar) return { forzar: true, motivo: motivo?.trim() }
  return {}
}

const cambiarEstado = (c: CambioEstadoPeriodo) => {
  const accion = ACCION_ESTADO[c.estado]
  if (!accion) noDisponible(`El cambio de estado a ${c.estado}`)
  return api.post<PeriodoTitulacion>(`/periodos/${c.id}/${accion}`, cuerpoCambioEstado(c))
}

// iniciar titulación suspende a los condicionados pendientes y cerrar vence las reservas
const INVALIDA_CAMBIO_ESTADO = [K.periodos, K.habilitados, K.postulaciones, K.temas]

export const useCambiarEstadoPeriodo = () =>
  useMutacion({
    fn: cambiarEstado,
    invalida: INVALIDA_CAMBIO_ESTADO,
    exito: 'Estado del período actualizado.',
  })

/** Transición forzada: el error se muestra dentro del diálogo de advertencia, no como aviso. */
export const useTransicionForzada = () =>
  useMutacion({
    fn: (c: Omit<CambioEstadoPeriodo, 'forzar'>) => cambiarEstado({ ...c, forzar: true }),
    invalida: INVALIDA_CAMBIO_ESTADO,
    exito: 'Transición forzada aplicada. La fecha del período se ajustó a la hora actual.',
    silenciarError: () => true,
  })
