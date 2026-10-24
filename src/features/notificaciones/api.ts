import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { K } from '@/api/claves'
import { useMutacion } from '@/api/mutacion'
import type { Notificacion } from '@/types/dominio'

/** RF-16: se consulta periódicamente para reflejar nuevas notificaciones. */
export const useNotificaciones = () =>
  useQuery({
    queryKey: K.notificaciones,
    queryFn: () => api.todas<Notificacion>('/notificaciones'),
    refetchInterval: 30_000,
  })

export const useMarcarLeida = () =>
  useMutacion({
    fn: (id: string) => api.post<void>(`/notificaciones/${id}/leer`, {}),
    invalida: [K.notificaciones],
  })

/** El backend marca de a una; se recorren las no leídas. */
export const useMarcarTodasLeidas = () =>
  useMutacion({
    fn: async () => {
      const pendientes = await api.todas<Notificacion>('/notificaciones', { leida: false })
      await Promise.all(pendientes.map((n) => api.post<void>(`/notificaciones/${n.id}/leer`, {})))
    },
    invalida: [K.notificaciones],
  })
