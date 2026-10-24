import { useQuery } from '@tanstack/react-query'
import { api, ApiError, noDisponible, oNulo } from '@/api/client'
import {
  asignacionDesdeTutoria,
  asignacionTema,
  asignacionTutor,
  cargaDocente,
  type AsignacionTemaB,
  type AsignacionTutorB,
  type CargaActualB,
  type DocumentoPatB,
} from '@/api/adaptadores'
import { FLUJO, K } from '@/api/claves'
import { useMutacion } from '@/api/mutacion'
import { useUsuario } from '@/auth/AuthProvider'
import { usePeriodo } from '@/features/periodos/PeriodoContext'
import type {
  AsignacionTema,
  AsignacionTutor,
  CargaDocente,
  CausaAnulacion,
  EstadoAsignacionTema,
} from '@/types/dominio'

const ultimoPat = (periodoId: string, asignacionId: string) =>
  oNulo(
    api.get<DocumentoPatB>(
      `/periodos/${periodoId}/asignaciones-tema/${asignacionId}/documentos-pat/ultima`,
    ),
  )

/** Historial de tutores de una asignación; el ADMIN filtra el listado general. */
async function tutoresDe(periodoId: string, asignacionId: string, admin: boolean) {
  const tutorias = admin
    ? await api.todas<AsignacionTutorB>(`/periodos/${periodoId}/asignaciones-tutor`, {
        asignacionTemaId: asignacionId,
      })
    : (await api.todas<AsignacionTutorB>(`/periodos/${periodoId}/asignaciones-tutor/me`)).filter(
        (t) => t.asignacionTemaId === asignacionId,
      )
  return tutorias
    .map(asignacionTutor)
    .sort((a, b) => b.fechaAsignacion.localeCompare(a.fechaAsignacion))
}

async function completar(
  periodoId: string,
  a: AsignacionTemaB,
  tutorVigente: AsignacionTutor | null,
): Promise<AsignacionTema> {
  const pat = a.estado === 'VIGENTE' ? await ultimoPat(periodoId, a.id) : null
  return asignacionTema(a, { tutorVigente, estadoPat: pat?.revision ?? null })
}

export const useAsignaciones = (periodoId?: string, estado?: EstadoAsignacionTema | '') =>
  useQuery({
    queryKey: [...K.asignaciones, periodoId, estado],
    queryFn: async () => {
      const [asignaciones, tutorias] = await Promise.all([
        api.todas<AsignacionTemaB>(`/periodos/${periodoId}/asignaciones-tema`, { estado }),
        api.todas<AsignacionTutorB>(`/periodos/${periodoId}/asignaciones-tutor`, {
          estado: 'VIGENTE',
        }),
      ])
      const tutorPorAsignacion = new Map(
        tutorias.map((t) => [t.asignacionTemaId, asignacionTutor(t)]),
      )
      return Promise.all(
        asignaciones.map((a) => completar(periodoId!, a, tutorPorAsignacion.get(a.id) ?? null)),
      )
    },
    enabled: !!periodoId,
  })

export const useAsignacion = (id?: string) => {
  const { periodoId } = usePeriodo()
  const { rol } = useUsuario()
  return useQuery({
    queryKey: [...K.asignaciones, 'detalle', id],
    queryFn: async () => {
      const [a, tutores] = await Promise.all([
        api.get<AsignacionTemaB>(`/periodos/${periodoId}/asignaciones-tema/${id}`),
        rol === 'ESTUDIANTE' ? Promise.resolve([]) : tutoresDe(periodoId!, id!, rol === 'ADMIN'),
      ])
      return completar(periodoId!, a, tutores.find((t) => t.estado === 'VIGENTE') ?? null)
    },
    enabled: !!id && !!periodoId,
  })
}

export const useMiAsignacion = (periodoId?: string) =>
  useQuery({
    queryKey: [...K.asignaciones, 'mia', periodoId],
    queryFn: async () => {
      const [asignaciones, tutorias] = await Promise.all([
        api.todas<AsignacionTemaB>(`/periodos/${periodoId}/asignaciones-tema/me`),
        api.todas<AsignacionTutorB>(`/periodos/${periodoId}/asignaciones-tutor/me`),
      ])
      const a = asignaciones.find((x) => x.estado === 'VIGENTE') ?? asignaciones[0]
      if (!a) return null
      const tutor = tutorias.find((t) => t.asignacionTemaId === a.id && t.estado === 'VIGENTE')
      return completar(periodoId!, a, tutor ? asignacionTutor(tutor) : null)
    },
    enabled: !!periodoId,
  })

export const useAsignarTema = () => {
  const { periodoId } = usePeriodo()
  return useMutacion({
    fn: async ({ postulacionId, motivo }: { postulacionId: string; motivo?: string }) =>
      asignacionTema(
        await api.post<AsignacionTemaB>(
          `/periodos/${periodoId}/postulaciones/${postulacionId}/asignar-tema`,
          { motivo: motivo?.trim() || 'Asignación aprobada por la comisión de titulación.' },
        ),
      ),
    invalida: FLUJO,
    exito: 'Tema asignado. Las demás postulaciones al tema fueron rechazadas.',
  })
}

export const useAnularAsignacion = () =>
  useMutacion<
    AsignacionTema,
    { id: string; causaAnulacion: CausaAnulacion; motivoAnulacion: string }
  >({
    fn: async () => noDisponible('La anulación manual de asignaciones'),
    invalida: FLUJO,
  })

export const useHistorialTutores = (asignacionId?: string) => {
  const { periodoId } = usePeriodo()
  const { rol } = useUsuario()
  return useQuery({
    queryKey: [...K.asignaciones, 'tutores', asignacionId],
    queryFn: () => tutoresDe(periodoId!, asignacionId!, rol === 'ADMIN'),
    enabled: !!asignacionId && !!periodoId && rol !== 'ESTUDIANTE',
  })
}

export const CODIGO_ADVERTENCIA_CARGA = 'CARGA_TUTORIAL_ADVERTENCIA'

interface ResultadoAsignacionTutorB {
  asignacion: AsignacionTutorB
  advertencias: string[]
}

/**
 * Asigna el tutor; si ya hay uno vigente, lo reemplaza. Cuando el docente figura entre los
 * tutores propuestos se envía la propuesta para registrar el tipo PROPUESTO_CONFIRMADO.
 */
export const useAsignarTutor = () => {
  const { periodoId } = usePeriodo()
  return useMutacion({
    fn: async ({
      asignacionId,
      docenteId,
      motivoCambio,
    }: {
      asignacionId: string
      docenteId: string
      motivoCambio?: string
      confirmarExceso?: boolean
    }) => {
      const base = `/periodos/${periodoId}`
      const [vigentes, propuestos] = await Promise.all([
        api.todas<AsignacionTutorB>(`${base}/asignaciones-tutor`, {
          asignacionTemaId: asignacionId,
          estado: 'VIGENTE',
        }),
        api.todas<{ id: string; docenteId: string }>(
          `${base}/asignaciones-tema/${asignacionId}/tutores-propuestos`,
        ),
      ])
      const tutorPropuestoId = propuestos.find((p) => p.docenteId === docenteId)?.id
      const vigente = vigentes[0]
      const r = vigente
        ? await api.post<ResultadoAsignacionTutorB>(
            `${base}/asignaciones-tutor/${vigente.id}/reemplazar`,
            {
              docenteId,
              tutorPropuestoId,
              motivo: motivoCambio?.trim() || 'Cambio de tutor registrado por la comisión.',
            },
          )
        : await api.post<ResultadoAsignacionTutorB>(
            `${base}/asignaciones-tema/${asignacionId}/asignar-tutor`,
            { docenteId, tutorPropuestoId },
          )
      return { ...asignacionTutor(r.asignacion), advertencias: r.advertencias }
    },
    invalida: FLUJO,
    exito: (r) =>
      [
        `${r.docente.nombres} ${r.docente.apellidos} asignado(a) como tutor(a).`,
        ...r.advertencias,
      ].join(' '),
    // la advertencia de carga se resuelve con un diálogo de confirmación en el componente
    silenciarError: (e: ApiError) => e.code === CODIGO_ADVERTENCIA_CARGA,
  })
}

export const useMisTutorias = (periodoId?: string) =>
  useQuery({
    queryKey: [...K.me, 'tutorias', periodoId],
    queryFn: async () => {
      const tutorias = await api.todas<AsignacionTutorB>(
        `/periodos/${periodoId}/asignaciones-tutor/me`,
        { estado: 'VIGENTE' },
      )
      return Promise.all(
        tutorias.map(async (t) => {
          const a = asignacionDesdeTutoria(t)
          const pat = await ultimoPat(periodoId!, a.id)
          return { ...a, estadoPat: pat?.revision ?? null }
        }),
      )
    },
    enabled: !!periodoId,
  })

export const useMiCarga = (periodoId?: string) => {
  const usuario = useUsuario()
  return useQuery({
    queryKey: [...K.me, 'carga', periodoId],
    queryFn: async (): Promise<CargaDocente> =>
      cargaDocente(await api.get<CargaActualB>(`/periodos/${periodoId}/carga-tutorial/me`), {
        id: usuario.docenteId ?? '',
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        email: usuario.email,
        cedula: '',
      }),
    enabled: !!periodoId,
  })
}
