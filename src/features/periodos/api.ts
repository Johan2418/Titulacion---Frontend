import { useQuery } from '@tanstack/react-query'
import { api, noDisponible, oNulo } from '@/api/client'
import type { AsignacionTemaB, DocumentoPatB } from '@/api/adaptadores'
import { K } from '@/api/claves'
import { useMutacion } from '@/api/mutacion'
import {
  ESTADOS_POSTULACION,
  ESTADOS_TEMA,
  type EstadoPeriodo,
  type EstadoPostulacion,
  type EstadoTema,
  type PeriodoTitulacion,
  type ResumenPeriodo,
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

const total = (path: string, query: Record<string, string> = {}) =>
  api.get<{ total: number }>(path, { ...query, page: 1, limit: 1 }).then((r) => r.total)

function contarPor<E extends string>(estados: readonly E[], items: { estado: E }[]) {
  const conteo = Object.fromEntries(estados.map((e) => [e, 0])) as Record<E, number>
  for (const i of items) conteo[i.estado] = (conteo[i.estado] ?? 0) + 1
  return conteo
}

/** KPIs del panel: el backend no tiene un endpoint agregado; se calculan con sus listados. */
async function resumenPeriodo(pid: string): Promise<ResumenPeriodo> {
  const base = `/periodos/${pid}`
  const [habilitados, condicionados, temas, postulaciones, conflictos, asignaciones, tutorias] =
    await Promise.all([
      total(`${base}/habilitados`),
      total(`${base}/habilitados`, {
        condicionIngreso: 'CONDICIONADO',
        situacionIngreso: 'PENDIENTE',
      }),
      api.todas<{ estado: EstadoTema }>(`${base}/temas`),
      api.todas<{ estado: EstadoPostulacion }>(`${base}/postulaciones`),
      total(`${base}/conflictos`, { estado: 'SIN_RESOLVER' }),
      api.todas<AsignacionTemaB>(`${base}/asignaciones-tema`, { estado: 'VIGENTE' }),
      api.todas<{ asignacionTemaId: string }>(`${base}/asignaciones-tutor`, {
        estado: 'VIGENTE',
      }),
    ])
  const conTutor = new Set(tutorias.map((t) => t.asignacionTemaId))
  const ultimos = await Promise.all(
    asignaciones.map((a) =>
      oNulo(api.get<DocumentoPatB>(`${base}/asignaciones-tema/${a.id}/documentos-pat/ultima`)),
    ),
  )
  return {
    estudiantesHabilitados: habilitados,
    condicionadosPendientes: condicionados,
    temasPorEstado: contarPor(ESTADOS_TEMA, temas),
    postulacionesPorEstado: contarPor(ESTADOS_POSTULACION, postulaciones),
    conflictosAbiertos: conflictos,
    asignacionesVigentes: asignaciones.length,
    sinTutor: asignaciones.filter((a) => !conTutor.has(a.id)).length,
    patPorRevisar: ultimos.filter((d) => d?.revision === 'PENDIENTE').length,
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
