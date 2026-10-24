import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { noDisponible } from '@/api/client'
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

/** El backend registra la auditoría pero aún no expone un endpoint de consulta. */
export const useAuditoria = (f: FiltrosAuditoria) =>
  useQuery<Paginado<Auditoria>>({
    queryKey: [...K.auditoria, f],
    queryFn: async () => noDisponible('La consulta de auditoría'),
    placeholderData: keepPreviousData,
    retry: false,
  })
