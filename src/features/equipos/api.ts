import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { FLUJO, K } from '@/api/claves'
import { useMutacion } from '@/api/mutacion'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import type {
  EstadoAsignacionTema,
  Modalidad,
  OrigenAsignacion,
  RolEnGrupo,
  SituacionIngreso,
  TipoAsignacionTutor,
  UUID,
} from '@/types/dominio'

// Respuestas de /periodos/:pid/equipos (el cliente HTTP ya convierte las claves a camelCase).

export interface DocenteEquipo {
  id: UUID
  nombres: string
  apellidos: string
  tituloAcademico: string | null
}

export interface CandidatoTutor {
  id: UUID
  prioridad: number
  docente: DocenteEquipo
  elegibleActualmente: boolean
  carga: { actual: number; maxTrabajos: number | null; bloquearAlSuperar: boolean | null }
}

/** Estado PAT individual; la carga del Word del PAT (pieza B) se añadirá en esta sección. */
export interface PatIntegrante {
  datosPersonalesRegistrados: boolean
  contenidoRegistrado: boolean
  ultimaGeneracion: { id: UUID; estado: string; solicitadaEn: string } | null
  ultimaEntrega: { id: UUID; version: number; fechaCarga: string; revision: string | null } | null
}

export interface IntegranteEquipo {
  estudianteId: UUID
  nombres: string
  apellidos: string
  matricula: string
  rolEnGrupo: RolEnGrupo | null
  situacionIngreso: SituacionIngreso | null
  pat: PatIntegrante
}

export interface Equipo {
  id: UUID
  periodoId: UUID
  origen: OrigenAsignacion
  estado: EstadoAsignacionTema
  modalidad: Modalidad
  motivo: string
  fechaAsignacion: string
  tema: { id: UUID; titulo: string; tipo: string; estado: string }
  grupo: { id: UUID; nombre: string; estado: string } | null
  integrantes: IntegranteEquipo[]
  candidatos: CandidatoTutor[]
  tutorVigente: {
    id: UUID
    tipo: TipoAsignacionTutor
    candidatoTutorId: UUID | null
    fechaAsignacion: string
    docente: DocenteEquipo
  } | null
}

export interface EquipoResumen {
  id: UUID
  estado: EstadoAsignacionTema
  modalidad: Modalidad
  fechaAsignacion: string
  tema: { id: UUID; titulo: string }
  grupo: { id: UUID; nombre: string } | null
  integrantes: Array<{ estudianteId: UUID; nombres: string; apellidos: string }>
  totalCandidatos: number
  tutorVigente: { docenteId: UUID; nombres: string; apellidos: string } | null
}

export interface ResultadoEquipo {
  equipo: Equipo
  advertencias: string[]
}

export interface NuevoEquipo {
  periodoId: UUID
  estudianteIds: UUID[]
  temaId: UUID
  /** En orden de prioridad; con uno solo queda como tutor vigente. */
  docenteIds: UUID[]
  nombreGrupo?: string
  motivo: string
}

export const useEquipos = (periodoId?: string) =>
  useQuery({
    queryKey: [...K.equipos, periodoId],
    queryFn: () => api.todas<EquipoResumen>(`/periodos/${periodoId}/equipos`),
    enabled: !!periodoId,
  })

export const useEquipo = (id?: string) => {
  const { periodoId } = usePeriodo()
  return useQuery({
    queryKey: [...K.equipos, 'detalle', periodoId, id],
    queryFn: () => api.get<Equipo>(`/periodos/${periodoId}/equipos/${id}`),
    enabled: !!id && !!periodoId,
  })
}

const conAdvertencias = (base: string, r: ResultadoEquipo) =>
  r.advertencias.length ? `${base} ${r.advertencias.join(' ')}` : base

export const useCrearEquipo = () =>
  useMutacion({
    fn: ({ periodoId, nombreGrupo, motivo, ...resto }: NuevoEquipo) =>
      api.post<ResultadoEquipo>(`/periodos/${periodoId}/equipos`, {
        ...resto,
        nombreGrupo: nombreGrupo?.trim() || undefined,
        motivo: motivo.trim(),
      }),
    invalida: FLUJO,
    exito: (r) =>
      conAdvertencias(
        r.equipo.tutorVigente
          ? 'Equipo conformado con su tutor vigente.'
          : 'Equipo conformado. Confirme el tutor entre los candidatos cuando corresponda.',
        r,
      ),
  })

export const useAsignarTutorCandidato = () => {
  const { periodoId } = usePeriodo()
  return useMutacion({
    fn: ({
      equipoId,
      candidatoId,
      motivo,
    }: {
      equipoId: UUID
      candidatoId: UUID
      motivo?: string
    }) =>
      api.post<ResultadoEquipo>(`/periodos/${periodoId}/equipos/${equipoId}/tutor`, {
        candidatoId,
        motivo: motivo?.trim() || undefined,
      }),
    invalida: FLUJO,
    exito: (r) => conAdvertencias('Tutor vigente actualizado.', r),
  })
}
