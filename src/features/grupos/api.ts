import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { FLUJO, K } from '@/api/claves'
import { useMutacion } from '@/api/mutacion'
import type { Grupo, Invitacion } from '@/types/dominio'

export const useMiGrupo = (periodoId?: string) =>
  useQuery({
    queryKey: [...K.grupos, 'mio', periodoId],
    queryFn: () => api.get<Grupo | null>('/me/grupo', { periodoId }),
    enabled: !!periodoId,
  })

export const useGrupos = (periodoId?: string) =>
  useQuery({
    queryKey: [...K.grupos, periodoId],
    queryFn: () => api.get<Grupo[]>('/grupos', { periodoId }),
    enabled: !!periodoId,
  })

export const useCrearGrupo = () =>
  useMutacion({
    fn: (b: { periodoId: string; nombre: string }) => api.post<Grupo>('/grupos', b),
    invalida: FLUJO,
    exito: 'Grupo creado. Ahora eres su representante.',
  })

export const useSalirGrupo = () =>
  useMutacion({
    fn: (grupoId: string) => api.post<void>(`/grupos/${grupoId}/salir`),
    invalida: FLUJO,
    exito: 'Saliste del grupo.',
  })

export const useInvitacionesGrupo = (grupoId?: string) =>
  useQuery({
    queryKey: [...K.invitaciones, 'grupo', grupoId],
    queryFn: () => api.get<Invitacion[]>(`/grupos/${grupoId}/invitaciones`),
    enabled: !!grupoId,
  })

export const useMisInvitaciones = () =>
  useQuery({
    queryKey: [...K.invitaciones, 'mias'],
    queryFn: () => api.get<Invitacion[]>('/me/invitaciones'),
  })

export const useInvitar = () =>
  useMutacion({
    fn: ({ grupoId, estudianteId }: { grupoId: string; estudianteId: string }) =>
      api.post<Invitacion>(`/grupos/${grupoId}/invitaciones`, { estudianteId }),
    invalida: [K.invitaciones, K.habilitados],
    exito: 'Invitación enviada.',
  })

export const useResponderInvitacion = () =>
  useMutacion({
    fn: ({ id, accion }: { id: string; accion: 'aceptar' | 'rechazar' | 'cancelar' }) =>
      api.post<Invitacion>(`/invitaciones/${id}/${accion}`),
    invalida: FLUJO,
    exito: (_r, v) =>
      ({
        aceptar: 'Te uniste al grupo.',
        rechazar: 'Invitación rechazada.',
        cancelar: 'Invitación cancelada.',
      })[v.accion],
  })
