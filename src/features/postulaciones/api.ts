import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { FLUJO, K } from '@/api/claves'
import { useMutacion } from '@/api/mutacion'
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

export const usePostulaciones = (f: FiltrosPostulacion) =>
  useQuery({
    queryKey: [...K.postulaciones, f],
    queryFn: () => api.get<Postulacion[]>('/postulaciones', { ...f }),
    enabled: !!f.periodoId,
  })

export const usePostulacion = (id?: string) =>
  useQuery({
    queryKey: [...K.postulaciones, 'detalle', id],
    queryFn: () => api.get<Postulacion>(`/postulaciones/${id}`),
    enabled: !!id,
  })

export const useMisPostulaciones = (periodoId?: string) =>
  useQuery({
    queryKey: [...K.postulaciones, 'mias', periodoId],
    queryFn: () => api.get<Postulacion[]>('/me/postulaciones', { periodoId }),
    enabled: !!periodoId,
  })

export const usePostular = () =>
  useMutacion({
    fn: (b: { temaId: string; modalidad: Modalidad; tutores: string[] }) =>
      api.post<Postulacion>('/postulaciones', b),
    invalida: FLUJO,
    exito: 'Postulación registrada.',
  })

export const useCancelarPostulacion = () =>
  useMutacion({
    fn: (id: string) => api.post<Postulacion>(`/postulaciones/${id}/cancelar`),
    invalida: FLUJO,
    exito: 'Postulación cancelada.',
  })

export const useAceptarPostulacion = () =>
  useMutacion({
    fn: (id: string) => api.post<Postulacion>(`/postulaciones/${id}/aceptar`),
    invalida: FLUJO,
    exito: 'Postulación aceptada. Ya puede asignar el tema.',
  })

export const useRechazarPostulacion = () =>
  useMutacion({
    fn: ({ id, observacion }: { id: string; observacion: string }) =>
      api.post<Postulacion>(`/postulaciones/${id}/rechazar`, { observacion }),
    invalida: FLUJO,
    exito: 'Postulación rechazada.',
  })

export const useConflictos = (periodoId?: string) =>
  useQuery({
    queryKey: [...K.conflictos, 'abiertos', periodoId],
    queryFn: () => api.get<ConflictoAbierto[]>('/conflictos', { periodoId }),
    enabled: !!periodoId,
  })

export const useResoluciones = (periodoId?: string) =>
  useQuery({
    queryKey: [...K.conflictos, 'resoluciones', periodoId],
    queryFn: () => api.get<ResolucionConflicto[]>('/resoluciones-conflicto', { periodoId }),
    enabled: !!periodoId,
  })

export interface ResolucionInput {
  temaId: string
  criterioAplicado: CriterioConflicto
  participantes: { postulacionId: string; puntajeCriterio: number | null }[]
  postulacionGanadoraId: string
  justificacion: string
}

export const useResolverConflicto = () =>
  useMutacion({
    fn: (b: ResolucionInput) => api.post<ResolucionConflicto>('/resoluciones-conflicto', b),
    invalida: FLUJO,
    exito: 'Conflicto resuelto. La postulación ganadora quedó aceptada.',
  })
