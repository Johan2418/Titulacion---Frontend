import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { K } from '@/api/claves'
import type { Auditoria, Paginado } from '@/types/dominio'

export interface FiltrosAuditoria {
  entidadTipo?: string
  entidadId?: string
  accion?: string
  q?: string
  page: number
  pageSize: number
}

export const useAuditoria = (f: FiltrosAuditoria) =>
  useQuery({
    queryKey: [...K.auditoria, f],
    queryFn: () => api.get<Paginado<Auditoria>>('/auditoria', { ...f }),
    placeholderData: keepPreviousData,
  })
