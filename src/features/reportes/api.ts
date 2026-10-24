import { useQuery } from '@tanstack/react-query'
import { noDisponible } from '@/api/client'
import { K } from '@/api/claves'
import { useMutacion } from '@/api/mutacion'
import type { FormatoExportacion, SolicitudExportacion, TipoReporte } from '@/types/dominio'

/** RF-36: las exportaciones todavía no existen en el backend. */
export const useExportaciones = () =>
  useQuery<SolicitudExportacion[]>({
    queryKey: K.exportaciones,
    queryFn: async () => noDisponible('La exportación de reportes'),
    retry: false,
  })

export const useSolicitarExportacion = () =>
  useMutacion<
    SolicitudExportacion,
    {
      tipoReporte: TipoReporte
      formato: FormatoExportacion
      periodoId?: string
      filtros?: Record<string, unknown>
    }
  >({
    fn: async () => noDisponible('La exportación de reportes'),
    invalida: [K.exportaciones],
  })

export async function descargarExportacion(_id: string): Promise<void> {
  noDisponible('La descarga de exportaciones')
}
