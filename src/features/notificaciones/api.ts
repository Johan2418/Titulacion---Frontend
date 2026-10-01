import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { K } from '@/api/claves'
import { useMutacion } from '@/api/mutacion'
import type { Notificacion } from '@/types/dominio'

/** RF-16: se consulta periódicamente para reflejar nuevas notificaciones. */
export const useNotificaciones = () =>
  useQuery({
    queryKey: K.notificaciones,
    queryFn: () => api.get<Notificacion[]>('/me/notificaciones'),
    refetchInterval: 30_000,
  })

export const useMarcarLeida = () =>
  useMutacion({
    fn: (id: string) => api.post<void>(`/notificaciones/${id}/leida`),
    invalida: [K.notificaciones],
  })

export const useMarcarTodasLeidas = () =>
  useMutacion({
    fn: () => api.post<void>('/me/notificaciones/leer-todas'),
    invalida: [K.notificaciones],
  })
