import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { auditoria, type AuditoriaB } from '@/api/adaptadores'
import { api, type Pagina } from '@/api/client'
import { K } from '@/api/claves'
import type { Auditoria, Paginado } from '@/types/dominio'

export interface FiltrosAuditoria {
  entidadTipo?: string
  entidadId?: string
  accion?: string
  usuarioId?: string
  /** Fecha `YYYY-MM-DD` inicial (inclusive). */
  desde?: string
  /** Fecha `YYYY-MM-DD` final (inclusive: el backend incluye todo ese día). */
  hasta?: string
  q?: string
  page: number
  pageSize: number
}

/** RF-34: consulta paginada en el servidor (solo ADMIN), más reciente primero. */
export const useAuditoria = (f: FiltrosAuditoria) =>
  useQuery<Paginado<Auditoria>>({
    queryKey: [...K.auditoria, f],
    queryFn: async ({ signal }) => {
      const r = await api.get<Pagina<AuditoriaB>>(
        '/auditoria',
        {
          entidadTipo: f.entidadTipo,
          entidadId: f.entidadId,
          accion: f.accion,
          usuarioId: f.usuarioId,
          desde: f.desde,
          hasta: f.hasta,
          q: f.q?.trim(),
          page: f.page,
          limit: f.pageSize,
        },
        signal,
      )
      return { items: r.data.map(auditoria), total: r.total, page: r.page, pageSize: r.limit }
    },
    placeholderData: keepPreviousData,
  })
