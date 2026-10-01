import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { K } from '@/api/claves'
import { descargarUrl, useMutacion } from '@/api/mutacion'
import type { FormatoExportacion, SolicitudExportacion, TipoReporte } from '@/types/dominio'

/** RF-36: las exportaciones se procesan en segundo plano; se consulta hasta que estén listas. */
export const useExportaciones = () =>
  useQuery({
    queryKey: K.exportaciones,
    queryFn: () => api.get<SolicitudExportacion[]>('/exportaciones'),
    refetchInterval: (q) =>
      q.state.data?.some((e) => e.estado === 'EN_COLA' || e.estado === 'PROCESANDO') ? 1500 : false,
  })

export const useSolicitarExportacion = () =>
  useMutacion({
    fn: (b: {
      tipoReporte: TipoReporte
      formato: FormatoExportacion
      periodoId?: string
      filtros?: Record<string, unknown>
    }) => api.post<SolicitudExportacion>('/exportaciones', b),
    invalida: [K.exportaciones],
    exito: 'Solicitud registrada. El archivo se generará en segundo plano.',
  })

export async function descargarExportacion(id: string) {
  const r = await api.get<{ url: string; nombreArchivo: string }>(`/exportaciones/${id}/descarga`)
  descargarUrl(r.url, r.nombreArchivo)
}
