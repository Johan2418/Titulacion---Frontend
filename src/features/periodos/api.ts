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

export const usePeriodos = () => useQuery({ queryKey: K.periodos, queryFn: listarPeriodos })

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

/** El backend expone una acción por cada transición del período. */
const ACCION_ESTADO: Partial<Record<EstadoPeriodo, string>> = {
  POSTULACION_ABIERTA: 'abrir-postulacion',
  POSTULACION_CERRADA: 'cerrar-postulacion',
  EN_CURSO: 'iniciar-titulacion',
  ARCHIVADO: 'archivar',
}

export const useCambiarEstadoPeriodo = () =>
  useMutacion({
    fn: ({ id, estado, motivo }: { id: string; estado: EstadoPeriodo; motivo?: string }) => {
      const accion = ACCION_ESTADO[estado]
      if (!accion) noDisponible(`El cambio de estado a ${estado}`)
      // archivar exige un motivo; las demás transiciones no admiten cuerpo
      return api.post<PeriodoTitulacion>(
        `/periodos/${id}/${accion}`,
        estado === 'ARCHIVADO' ? { motivo } : {},
      )
    },
    // iniciar titulación suspende a los condicionados pendientes: refrescar habilitados
    invalida: [K.periodos, K.habilitados],
    exito: 'Estado del período actualizado.',
  })
