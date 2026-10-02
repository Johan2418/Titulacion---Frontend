import { useQuery } from '@tanstack/react-query'
import { api, ApiError } from '@/api/client'
import { FLUJO, K } from '@/api/claves'
import { useMutacion } from '@/api/mutacion'
import type {
  AsignacionTema,
  AsignacionTutor,
  CargaDocente,
  CausaAnulacion,
  EstadoAsignacionTema,
} from '@/types/dominio'

export const useAsignaciones = (periodoId?: string, estado?: EstadoAsignacionTema | '') =>
  useQuery({
    queryKey: [...K.asignaciones, periodoId, estado],
    queryFn: () => api.get<AsignacionTema[]>('/asignaciones-tema', { periodoId, estado }),
    enabled: !!periodoId,
  })

export const useAsignacion = (id?: string) =>
  useQuery({
    queryKey: [...K.asignaciones, 'detalle', id],
    queryFn: () => api.get<AsignacionTema>(`/asignaciones-tema/${id}`),
    enabled: !!id,
  })

export const useMiAsignacion = (periodoId?: string) =>
  useQuery({
    queryKey: [...K.asignaciones, 'mia', periodoId],
    queryFn: () => api.get<AsignacionTema | null>('/me/asignacion', { periodoId }),
    enabled: !!periodoId,
  })

export const useAsignarTema = () =>
  useMutacion({
    fn: (b: { postulacionId: string; motivo?: string }) =>
      api.post<AsignacionTema>('/asignaciones-tema', b),
    invalida: FLUJO,
    exito: 'Tema asignado. Las demás postulaciones al tema fueron rechazadas.',
  })

export const useAnularAsignacion = () =>
  useMutacion({
    fn: ({ id, ...b }: { id: string; causaAnulacion: CausaAnulacion; motivoAnulacion: string }) =>
      api.post<AsignacionTema>(`/asignaciones-tema/${id}/anular`, b),
    invalida: FLUJO,
    exito: 'Asignación anulada. El tema vuelve a estar disponible.',
  })

export const useHistorialTutores = (asignacionId?: string) =>
  useQuery({
    queryKey: [...K.asignaciones, 'tutores', asignacionId],
    queryFn: () => api.get<AsignacionTutor[]>(`/asignaciones-tema/${asignacionId}/tutores`),
    enabled: !!asignacionId,
  })

export const CODIGO_ADVERTENCIA_CARGA = 'CARGA_TUTORIAL_ADVERTENCIA'

export const useAsignarTutor = () =>
  useMutacion({
    fn: ({
      asignacionId,
      ...b
    }: {
      asignacionId: string
      docenteId: string
      motivoCambio?: string
      confirmarExceso?: boolean
    }) => api.post<AsignacionTutor>(`/asignaciones-tema/${asignacionId}/tutor`, b),
    invalida: FLUJO,
    exito: (r) => `${r.docente.nombres} ${r.docente.apellidos} asignado(a) como tutor(a).`,
    // la advertencia de carga se resuelve con un diálogo de confirmación en el componente
    silenciarError: (e: ApiError) => e.code === CODIGO_ADVERTENCIA_CARGA,
  })

export const useMisTutorias = (periodoId?: string) =>
  useQuery({
    queryKey: [...K.me, 'tutorias', periodoId],
    queryFn: () => api.get<AsignacionTema[]>('/me/tutorias', { periodoId }),
  })

export const useMiCarga = (periodoId?: string) =>
  useQuery({
    queryKey: [...K.me, 'carga', periodoId],
    queryFn: () => api.get<CargaDocente>('/me/carga', { periodoId }),
  })
