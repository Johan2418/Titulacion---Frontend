import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { K } from '@/api/claves'
import type { Seguimiento } from '@/types/dominio'

export const useSeguimiento = (periodoId?: string) =>
  useQuery({
    queryKey: [...K.me, 'seguimiento', periodoId],
    queryFn: () => api.get<Seguimiento>('/me/seguimiento', { periodoId }),
  })
