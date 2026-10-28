import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import {
  docenteDisponible,
  estudianteResumen,
  persona,
  postulacion,
  type AsignacionTemaB,
  type PersonaB,
  type PostulacionB,
  type TutorDisponibleB,
  type TutorPropuestoB,
} from '@/api/adaptadores'
import { FLUJO, K } from '@/api/claves'
import { useMutacion } from '@/api/mutacion'
import { useUsuario } from '@/auth/AuthProvider'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import type {
  ConflictoAbierto,
  CriterioConflicto,
  EstadoPostulacion,
  Modalidad,
  Postulacion,
  ResolucionConflicto,
} from '@/types/dominio'

export interface FiltrosPostulacion {
  periodoId?: string
  temaId?: string
  estado?: EstadoPostulacion | ''
  modalidad?: Modalidad | ''
}

/** El backend embebe los tutores propuestos en cada postulación (sin una consulta por fila). */
const completar = (ps: PostulacionB[], vigentes?: AsignacionTemaB[]): Postulacion[] => {
  const asignacionPorPostulacion = new Map(vigentes?.map((a) => [a.postulacionId, a.id]))
  return ps.map((p) =>
    postulacion(p, { asignacionVigenteId: asignacionPorPostulacion.get(p.id) ?? null }),
  )
}

export const usePostulaciones = (f: FiltrosPostulacion) => {
  const { rol } = useUsuario()
  return useQuery({
    queryKey: [...K.postulaciones, f, rol],
    queryFn: async () => {
      const base = `/periodos/${f.periodoId}`
      const [ps, vigentes] = await Promise.all([
        api.todas<PostulacionB>(`${base}/postulaciones`, {
          temaId: f.temaId,
          estado: f.estado,
          modalidad: f.modalidad,
        }),
        rol === 'ADMIN'
          ? api.todas<AsignacionTemaB>(`${base}/asignaciones-tema`, { estado: 'VIGENTE' })
          : Promise.resolve(undefined),
      ])
      return completar(ps, vigentes)
    },
    enabled: !!f.periodoId,
  })
}

export const usePostulacion = (id?: string) => {
  const { periodoId } = usePeriodo()
  return useQuery({
    queryKey: [...K.postulaciones, 'detalle', id],
    queryFn: async () =>
      postulacion(await api.get<PostulacionB>(`/periodos/${periodoId}/postulaciones/${id}`)),
    enabled: !!id && !!periodoId,
  })
}

export const useMisPostulaciones = (periodoId?: string) =>
  useQuery({
    queryKey: [...K.postulaciones, 'mias', periodoId],
    queryFn: async () =>
      completar(await api.todas<PostulacionB>(`/periodos/${periodoId}/postulaciones/me`)),
    enabled: !!periodoId,
  })

/** Docentes que el estudiante puede proponer como tutores para un tema (RF-10). */
export const useTutoresDisponibles = (temaId?: string) => {
  const { periodoId } = usePeriodo()
  return useQuery({
    queryKey: [...K.docentes, 'disponibles', periodoId, temaId],
    queryFn: async () =>
      (
        await api.todas<TutorDisponibleB>(
          `/periodos/${periodoId}/temas/${temaId}/tutores-disponibles`,
        )
      ).map(docenteDisponible),
    enabled: !!temaId && !!periodoId,
  })
}

export const usePostular = () => {
  const { periodoId } = usePeriodo()
  return useMutacion({
    fn: async (b: { temaId: string; modalidad: Modalidad; tutores: string[] }) =>
      postulacion(
        await api.post<PostulacionB>(`/periodos/${periodoId}/postulaciones`, {
          temaId: b.temaId,
          modalidad: b.modalidad,
          tutoresPropuestos: b.tutores,
        }),
      ),
    invalida: FLUJO,
    exito: 'Postulación registrada.',
  })
}

export const useCancelarPostulacion = () => {
  const { periodoId } = usePeriodo()
  return useMutacion({
    fn: async (id: string) =>
      postulacion(
        await api.post<PostulacionB>(`/periodos/${periodoId}/postulaciones/${id}/cancelar`, {
          motivo: 'Cancelada por el postulante.',
        }),
      ),
    invalida: FLUJO,
    exito: 'Postulación cancelada.',
  })
}

// ── Conflictos (RF-23) ──
interface ConflictoTemaB {
  temaId: string
  titulo: string
  minIntegrantes: number
  maxIntegrantes: number
}

interface ConflictoDetalleB {
  periodoId: string
  tema: ConflictoTemaB
  resolucion: {
    id: string
    criterioAplicado: CriterioConflicto
    postulacionGanadoraId: string
    justificacion: string
    fechaResolucion: string
    responsable: PersonaB
    participantes: { postulacionId: string; puntajeCriterio: number | null }[]
  } | null
  postulaciones: {
    id: string
    estado: EstadoPostulacion
    grupoId: string | null
    grupoNombre?: string | null
    estudianteId: string | null
    numIntegrantes: number
    fechaPostulacion: string
    elegible: boolean
    participantes: PersonaB[]
  }[]
}

const postulacionDeConflicto = (
  d: ConflictoDetalleB,
  p: ConflictoDetalleB['postulaciones'][number],
): Postulacion => {
  const integrantes = p.participantes.map(estudianteResumen)
  return {
    id: p.id,
    tema: {
      id: d.tema.temaId,
      titulo: d.tema.titulo,
      minIntegrantes: d.tema.minIntegrantes,
      maxIntegrantes: d.tema.maxIntegrantes,
    },
    periodoId: d.periodoId,
    modalidad: p.grupoId ? 'GRUPAL' : 'INDIVIDUAL',
    grupo: p.grupoId ? { id: p.grupoId, nombre: p.grupoNombre ?? '' } : null,
    estudiante: p.estudianteId ? (integrantes[0] ?? null) : null,
    integrantes,
    numIntegrantes: p.numIntegrantes,
    registradaPor: persona(null),
    estado: p.estado,
    fechaPostulacion: p.fechaPostulacion,
    tutoresPropuestos: [],
  }
}

/** El listado ya trae candidaturas y resolución de cada tema (sin una consulta por conflicto). */
const conflictosPorEstado = async (
  periodoId: string,
  estado: 'SIN_RESOLVER' | 'RESUELTO',
): Promise<ConflictoDetalleB[]> =>
  (
    await api.todas<ConflictoTemaB & Omit<ConflictoDetalleB, 'periodoId' | 'tema'>>(
      `/periodos/${periodoId}/conflictos`,
      { estado },
    )
  ).map(({ resolucion, postulaciones, ...tema }) => ({
    periodoId,
    tema,
    resolucion,
    postulaciones,
  }))

export const useConflictos = (periodoId?: string) =>
  useQuery({
    queryKey: [...K.conflictos, 'abiertos', periodoId],
    queryFn: async (): Promise<ConflictoAbierto[]> =>
      (await conflictosPorEstado(periodoId!, 'SIN_RESOLVER')).map((d) => ({
        tema: { id: d.tema.temaId, titulo: d.tema.titulo },
        postulaciones: d.postulaciones
          .filter((p) => p.elegible)
          .map((p) => postulacionDeConflicto(d, p)),
      })),
    enabled: !!periodoId,
  })

export const useResoluciones = (periodoId?: string) =>
  useQuery({
    queryKey: [...K.conflictos, 'resoluciones', periodoId],
    queryFn: async (): Promise<ResolucionConflicto[]> =>
      (await conflictosPorEstado(periodoId!, 'RESUELTO'))
        .filter((d) => d.resolucion)
        .map((d) => {
          const r = d.resolucion!
          const porId = new Map(d.postulaciones.map((p) => [p.id, p]))
          return {
            id: r.id,
            tema: { id: d.tema.temaId, titulo: d.tema.titulo },
            periodoId: d.periodoId,
            resueltoPor: persona(r.responsable),
            criterioAplicado: r.criterioAplicado,
            postulacionGanadoraId: r.postulacionGanadoraId,
            justificacion: r.justificacion,
            fechaResolucion: r.fechaResolucion,
            participantes: r.participantes.map((pa) => {
              const p = porId.get(pa.postulacionId)
              const completa = p ? postulacionDeConflicto(d, p) : null
              return {
                id: pa.postulacionId,
                postulacion: {
                  id: pa.postulacionId,
                  modalidad: completa?.modalidad ?? 'INDIVIDUAL',
                  grupo: completa?.grupo ?? null,
                  estudiante: completa?.estudiante ?? null,
                  fechaPostulacion: completa?.fechaPostulacion ?? r.fechaResolucion,
                },
                puntajeCriterio: pa.puntajeCriterio,
              }
            }),
          }
        }),
    enabled: !!periodoId,
  })

export interface ResolucionInput {
  temaId: string
  criterioAplicado: CriterioConflicto
  participantes: { postulacionId: string; puntajeCriterio: number | null }[]
  postulacionGanadoraId: string
  justificacion: string
}

export const useResolverConflicto = () => {
  const { periodoId } = usePeriodo()
  return useMutacion({
    fn: ({ temaId, participantes, ...b }: ResolucionInput) =>
      api.post<unknown>(`/periodos/${periodoId}/temas/${temaId}/conflicto/resolver`, {
        ...b,
        // el backend no admite puntaje null: se omite cuando el criterio no lo usa
        participantes: participantes.map((p) => ({
          postulacionId: p.postulacionId,
          puntajeCriterio: p.puntajeCriterio ?? undefined,
        })),
      }),
    invalida: FLUJO,
    exito: 'Conflicto resuelto. La postulación ganadora quedó aceptada.',
  })
}
