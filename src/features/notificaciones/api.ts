import { useQuery } from '@tanstack/react-query'
import { api, type Pagina } from '@/api/client'
import { K } from '@/api/claves'
import { useMutacion } from '@/api/mutacion'
import type { Notificacion } from '@/types/dominio'

/** RF-16: el contador de no leídas se consulta periódicamente (consulta liviana para la campana). */
export const useContadorNoLeidas = () =>
  useQuery({
    queryKey: [...K.notificaciones, 'contador'],
    queryFn: async () =>
      (await api.get<{ total: number }>('/notificaciones/no-leidas/contador')).total,
    refetchInterval: 30_000,
  })

/** Primera página de la bandeja; la campana solo la consulta mientras el panel está abierto. */
export const useNotificacionesRecientes = (habilitado: boolean, limite = 10) =>
  useQuery({
    queryKey: [...K.notificaciones, 'recientes', limite],
    queryFn: async () =>
      (await api.get<Pagina<Notificacion>>('/notificaciones', { page: 1, limit: limite })).data,
    enabled: habilitado,
  })

/** Bandeja completa (página de notificaciones); sin sondeo periódico. */
export const useNotificaciones = () =>
  useQuery({
    queryKey: [...K.notificaciones, 'todas'],
    queryFn: () => api.todas<Notificacion>('/notificaciones'),
  })

export const useMarcarLeida = () =>
  useMutacion({
    fn: (id: string) => api.post<void>(`/notificaciones/${id}/leer`, {}),
    invalida: [K.notificaciones],
  })

/** Un único POST: el backend marca todas las notificaciones propias en un solo UPDATE. */
export const useMarcarTodasLeidas = () =>
  useMutacion({
    fn: () => api.post<{ actualizadas: number }>('/notificaciones/leer-todas'),
    invalida: [K.notificaciones],
  })
