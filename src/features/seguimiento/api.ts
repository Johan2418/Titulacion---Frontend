import { useQuery } from '@tanstack/react-query'
import { api, oNulo } from '@/api/client'
import {
  asignacionTema,
  asignacionTutor,
  documentoPat,
  grupo,
  habilitado,
  postulacion,
  type AsignacionTemaB,
  type AsignacionTutorB,
  type DocumentoPatB,
  type GrupoB,
  type HabilitadoB,
  type PostulacionB,
} from '@/api/adaptadores'
import { K } from '@/api/claves'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import type { EstadoPostulacion, Seguimiento } from '@/types/dominio'

/** Prioridad para elegir la postulación que resume el avance del estudiante. */
const RELEVANCIA: EstadoPostulacion[] = [
  'ACEPTADA',
  'EN_CONFLICTO',
  'PENDIENTE',
  'RECHAZADA',
  'CANCELADA',
  'ANULADA',
]

/** RF-15: vista agregada armada con los endpoints propios del estudiante. */
export const useSeguimiento = (periodoId?: string) => {
  const { periodo } = usePeriodo()
  return useQuery({
    queryKey: [...K.me, 'seguimiento', periodoId],
    queryFn: async (): Promise<Seguimiento> => {
      const base = `/periodos/${periodoId}`
      const [hab, g, invitaciones, postulaciones, asignaciones, tutorias] = await Promise.all([
        oNulo(api.get<HabilitadoB>(`${base}/habilitados/me`)),
        oNulo(api.get<GrupoB>(`${base}/grupos/me`)),
        api.get<{ total: number }>(`${base}/invitaciones/me`, {
          estado: 'PENDIENTE',
          page: 1,
          limit: 1,
        }),
        api.todas<PostulacionB>(`${base}/postulaciones/me`),
        api.todas<AsignacionTemaB>(`${base}/asignaciones-tema/me`),
        api.todas<AsignacionTutorB>(`${base}/asignaciones-tutor/me`),
      ])
      const p = [...postulaciones].sort(
        (a, b) => RELEVANCIA.indexOf(a.estado) - RELEVANCIA.indexOf(b.estado),
      )[0]
      const a = asignaciones.find((x) => x.estado === 'VIGENTE') ?? asignaciones[0]
      const pat = a
        ? await oNulo(
            api.get<DocumentoPatB>(`${base}/asignaciones-tema/${a.id}/documentos-pat/ultima`),
          )
        : null
      const tutor = a
        ? tutorias.find((t) => t.asignacionTemaId === a.id && t.estado === 'VIGENTE')
        : undefined
      return {
        periodo: periodo?.id === periodoId ? periodo : null,
        habilitacion: hab ? habilitado(hab) : null,
        grupo: g ? grupo(g) : null,
        invitacionesPendientes: invitaciones.total,
        postulacion: p ? postulacion(p) : null,
        asignacion: a
          ? asignacionTema(a, {
              tutorVigente: tutor ? asignacionTutor(tutor) : null,
              estadoPat: pat?.revision ?? null,
            })
          : null,
        ultimoPat: pat ? documentoPat(pat) : null,
      }
    },
    enabled: !!periodoId,
  })
}
